-- Badge triggers migration: adds automated awards based on activity
-- Note: Requires badge codes to exist in "Badge" (FRESHER_1, SOCIAL_BUTTERFLY_5,
-- VOICE_OF_REASON_10, POPULAR_OPINION_50, HELPER_20, DEADLINE_CRUSHER_24H,
-- THE_SCHOLAR_10, TASK_MASTER_50, SCRIBE_20)

-- =========================
-- Community join badges
-- =========================
DROP TRIGGER IF EXISTS trigger_check_social ON "Enrollment";

CREATE OR REPLACE FUNCTION check_community_badges()
RETURNS TRIGGER AS $$
DECLARE
  comm_count INT;
  badge_id INT;
BEGIN
  -- Count enrollments for the student
  SELECT COUNT(*) INTO comm_count FROM "Enrollment" WHERE "sid" = NEW."sid";

  -- Ensure target is a student
  IF NOT EXISTS (SELECT 1 FROM "Student" WHERE "uid" = NEW."sid") THEN
    RETURN NEW;
  END IF;

  -- Fresher: first community joined
  IF comm_count >= 1 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'FRESHER_1';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (NEW."sid", badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Social Butterfly: joined 5 different communities
  IF comm_count >= 5 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'SOCIAL_BUTTERFLY_5';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (NEW."sid", badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_social
AFTER INSERT ON "Enrollment"
FOR EACH ROW EXECUTE FUNCTION check_community_badges();

-- =========================
-- Voice of Reason: posts in PUBLIC communities
-- =========================
DROP TRIGGER IF EXISTS trigger_check_voice ON "Post";

CREATE OR REPLACE FUNCTION check_post_badges()
RETURNS TRIGGER AS $$
DECLARE
  post_count INT;
  badge_id INT;
BEGIN
  -- Only award to students
  IF NOT EXISTS (SELECT 1 FROM "Student" WHERE "uid" = NEW."owner_uid") THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO post_count
  FROM "Post" p
  JOIN "Community" c ON p."cid" = c."id"
  WHERE p."owner_uid" = NEW."owner_uid" AND c."type" = 'PUBLIC'::"CommunityType";

  IF post_count >= 10 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'VOICE_OF_REASON_10';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (NEW."owner_uid", badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_voice
AFTER INSERT ON "Post"
FOR EACH ROW EXECUTE FUNCTION check_post_badges();

-- =========================
-- Popular Opinion: upvotes received on authored posts
-- =========================
DROP TRIGGER IF EXISTS trigger_check_popular ON "Voted";

CREATE OR REPLACE FUNCTION check_vote_badges()
RETURNS TRIGGER AS $$
DECLARE
  author_uid INT;
  upvote_count INT;
  badge_id INT;
BEGIN
  -- Only consider upvotes
  IF NEW."voteType" IS DISTINCT FROM TRUE THEN
    RETURN NEW;
  END IF;

  -- Find the author of the post that received the vote
  SELECT "owner_uid" INTO author_uid FROM "Post" WHERE "id" = NEW."pid";
  IF author_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only award to students
  IF NOT EXISTS (SELECT 1 FROM "Student" WHERE "uid" = author_uid) THEN
    RETURN NEW;
  END IF;

  -- Count total upvotes received across the author's posts
  SELECT COUNT(*) INTO upvote_count
  FROM "Voted" v
  JOIN "Post" p ON v."pid" = p."id"
  WHERE p."owner_uid" = author_uid AND v."voteType" = TRUE;

  IF upvote_count >= 50 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'THE_FAMOUS_50';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (author_uid, badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_popular
AFTER INSERT ON "Voted"
FOR EACH ROW EXECUTE FUNCTION check_vote_badges();

-- =========================
-- Helper: commented on 20 different posts
-- =========================
DROP TRIGGER IF EXISTS trigger_check_helper ON "Comment";

CREATE OR REPLACE FUNCTION check_comment_badges()
RETURNS TRIGGER AS $$
DECLARE
  distinct_posts INT;
  badge_id INT;
BEGIN
  -- Only award to students
  IF NOT EXISTS (SELECT 1 FROM "Student" WHERE "uid" = NEW."commenter_uid") THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT "pid") INTO distinct_posts
  FROM "Comment"
  WHERE "commenter_uid" = NEW."commenter_uid";

  IF distinct_posts >= 20 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'HELPER_20';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (NEW."commenter_uid", badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_helper
AFTER INSERT ON "Comment"
FOR EACH ROW EXECUTE FUNCTION check_comment_badges();

-- Approved comments: APPROVED_5 and VERIFIED_10 (distinct posts with approved comments)
DROP TRIGGER IF EXISTS trigger_check_approved_comments ON "Comment";

CREATE OR REPLACE FUNCTION check_approved_comment_badges()
RETURNS TRIGGER AS $$
DECLARE
  approved_posts INT;
  badge_id INT;
BEGIN
  -- Only award to students
  IF NOT EXISTS (SELECT 1 FROM "Student" WHERE "uid" = NEW."commenter_uid") THEN
    RETURN NEW;
  END IF;

  -- Proceed only when a comment is approved by instructor or OP
  IF NOT (NEW."approved_by_inst" = TRUE OR NEW."approved_by_op" = TRUE) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT "pid") INTO approved_posts
  FROM "Comment"
  WHERE "commenter_uid" = NEW."commenter_uid"
    AND ("approved_by_inst" = TRUE OR "approved_by_op" = TRUE);

  IF approved_posts >= 5 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'APPROVED_5';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (NEW."commenter_uid", badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF approved_posts >= 10 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'VERIFIED_10';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (NEW."commenter_uid", badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_approved_comments
AFTER INSERT OR UPDATE OF "approved_by_inst", "approved_by_op" ON "Comment"
FOR EACH ROW EXECUTE FUNCTION check_approved_comment_badges();

-- =========================
-- Submissions: Deadline Crusher and The Scholar
-- =========================
DROP TRIGGER IF EXISTS trigger_check_submission ON "Submission";

CREATE OR REPLACE FUNCTION check_submission_badges()
RETURNS TRIGGER AS $$
DECLARE
  due_ts TIMESTAMP;
  badge_id INT;
BEGIN
  -- Only award to students
  IF NOT EXISTS (SELECT 1 FROM "Student" WHERE "uid" = NEW."sid") THEN
    RETURN NEW;
  END IF;

  SELECT "due_date" INTO due_ts FROM "Assignment" WHERE "id" = NEW."aid";

  -- Deadline Crusher: submission at least 24 hours before due_date
  IF due_ts IS NOT NULL AND NEW."subm_date" <= (due_ts - INTERVAL '24 hours') THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'DEADLINE_CRUSHER_24H';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (NEW."sid", badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Scholar: 10 total submissions by student
  IF (SELECT COUNT(*) FROM "Submission" WHERE "sid" = NEW."sid") >= 10 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'THE_SCHOLAR_10';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (NEW."sid", badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_submission
AFTER INSERT ON "Submission"
FOR EACH ROW EXECUTE FUNCTION check_submission_badges();

-- =========================
-- Task Master: 50 tasks marked Done (assumes status=3 is Done)
-- =========================
DROP TRIGGER IF EXISTS trigger_check_task_master ON "Task";

CREATE OR REPLACE FUNCTION check_task_badges()
RETURNS TRIGGER AS $$
DECLARE
  done_tasks INT;
  badge_id INT;
BEGIN
  -- Only act when status becomes Done
  IF NOT (NEW."status" = 3 AND (OLD."status" IS DISTINCT FROM 3)) THEN
    RETURN NEW;
  END IF;

  -- Only award to students
  IF NOT EXISTS (SELECT 1 FROM "Student" WHERE "uid" = NEW."author") THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO done_tasks FROM "Task" WHERE "author" = NEW."author" AND "status" = 3;

  IF done_tasks >= 50 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'TASK_MASTER_50';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (NEW."author", badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_task_master
AFTER UPDATE OF "status" ON "Task"
FOR EACH ROW EXECUTE FUNCTION check_task_badges();

-- =========================
-- Scribe: created 20 notes
-- =========================
DROP TRIGGER IF EXISTS trigger_check_scribe ON "Note";

CREATE OR REPLACE FUNCTION check_note_badges()
RETURNS TRIGGER AS $$
DECLARE
  note_count INT;
  badge_id INT;
BEGIN
  -- Only award to students
  IF NOT EXISTS (SELECT 1 FROM "Student" WHERE "uid" = NEW."owner_uid") THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO note_count FROM "Note" WHERE "owner_uid" = NEW."owner_uid";

  IF note_count >= 20 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'SCRIBBLER_20';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid") VALUES (NEW."owner_uid", badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_scribe
AFTER INSERT ON "Note"
FOR EACH ROW EXECUTE FUNCTION check_note_badges();

-- =========================
-- Special badges
-- =========================
-- Founding Member: requires user signup date relative to launch date (not available in current schema).
-- Streamer: requires attendance tracking for sessions (not available in current schema).
-- Bug Hunter: manual award by admins.
