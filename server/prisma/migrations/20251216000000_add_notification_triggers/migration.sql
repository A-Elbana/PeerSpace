-- Migration: add_notification_triggers
-- Creates PL/pgSQL trigger functions to auto-create notifications for key events

-- Helper: insert a notification row
CREATE OR REPLACE FUNCTION notify_system_user(recipient integer, msg text, ntype text, resource text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO "Notification" ("recipientId", "message", "type", "resourceId", "isRead", "createdAt")
  VALUES (recipient, msg, ntype::text, resource, false, now());
END;
$$ LANGUAGE plpgsql;

-- 1) New Assignment -> notify enrolled students (except assigner)
CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS trigger AS $$
BEGIN
  INSERT INTO "Notification" ("recipientId", "message", "type", "resourceId", "isRead", "createdAt")
  SELECT e.sid, concat('New assignment: ', NEW.title), 'ASSIGNMENT', NEW.id::text, false, now()
  FROM "Enrollment" e
  WHERE e.cid = NEW.cid AND e.sid <> NEW.assigner_uid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_assignment
AFTER INSERT ON "Assignment"
FOR EACH ROW EXECUTE PROCEDURE notify_new_assignment();

-- 2) New Announcement Post -> notify enrolled students (except post owner)
CREATE OR REPLACE FUNCTION notify_new_announcement_post()
RETURNS trigger AS $$
BEGIN
  IF LOWER(NEW.type) = 'announcement' THEN
    INSERT INTO "Notification" ("recipientId", "message", "type", "resourceId", "isRead", "createdAt")
    SELECT e.sid, concat('New announcement: ', COALESCE(NEW.title, '')), 'ANNOUNCEMENT', NEW.id::text, false, now()
    FROM "Enrollment" e
    WHERE e.cid = NEW.cid AND e.sid <> NEW.owner_uid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_announcement
AFTER INSERT ON "Post"
FOR EACH ROW EXECUTE PROCEDURE notify_new_announcement_post();

-- 3) Submission graded -> notify the submitting student when grade is set/updated
CREATE OR REPLACE FUNCTION notify_submission_graded()
RETURNS trigger AS $$
BEGIN
  -- Only notify when a grade is newly set or changed to a non-null value
  IF (TG_OP = 'UPDATE' AND NEW.grade IS NOT NULL AND (OLD.grade IS NULL OR OLD.grade <> NEW.grade)) THEN
    INSERT INTO "Notification" ("recipientId", "message", "type", "resourceId", "isRead", "createdAt")
    VALUES (NEW.sid, concat('Your submission was graded (Submission ID: ', NEW.id::text, ')'), 'SUBMISSION_GRADED', NEW.id::text, false, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_submission_graded
AFTER UPDATE ON "Submission"
FOR EACH ROW EXECUTE PROCEDURE notify_submission_graded();

-- 4) Reply to Comment -> notify parent comment author (if different)
CREATE OR REPLACE FUNCTION notify_reply_to_comment()
RETURNS trigger AS $$
DECLARE
  parent_uid integer;
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT commenter_uid INTO parent_uid FROM "Comment" WHERE id = NEW.parent_comment_id;
    IF parent_uid IS NOT NULL AND parent_uid <> NEW.commenter_uid THEN
      INSERT INTO "Notification" ("recipientId", "message", "type", "resourceId", "isRead", "createdAt")
      VALUES (parent_uid, concat('Someone replied to your comment'), 'REPLY', NEW.id::text, false, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_reply_to_comment
AFTER INSERT ON "Comment"
FOR EACH ROW EXECUTE PROCEDURE notify_reply_to_comment();

-- 5) Reply to Post (top-level comment) -> notify post owner (if different)
CREATE OR REPLACE FUNCTION notify_reply_to_post()
RETURNS trigger AS $$
DECLARE
  post_owner integer;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    SELECT owner_uid INTO post_owner FROM "Post" WHERE id = NEW.pid;
    IF post_owner IS NOT NULL AND post_owner <> NEW.commenter_uid THEN
      INSERT INTO "Notification" ("recipientId", "message", "type", "resourceId", "isRead", "createdAt")
      VALUES (post_owner, concat('Someone replied to your post'), 'REPLY', NEW.pid::text, false, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_reply_to_post
AFTER INSERT ON "Comment"
FOR EACH ROW EXECUTE PROCEDURE notify_reply_to_post();

-- Safety notes: The triggers attempt to avoid notifying the actor themselves.
-- If you want to tune message content or recipient selection (e.g. only instructors), adapt the SELECT/WHERE clauses.
