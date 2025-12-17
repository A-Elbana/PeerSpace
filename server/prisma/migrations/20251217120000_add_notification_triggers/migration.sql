-- =========================
-- Notification Triggers
-- =========================
-- Auto-creates notifications for key events in the system
-- Note: NotificationContent stores unique content; UserNotification tracks recipients

-- =========================
-- New Assignment
-- =========================
DROP TRIGGER IF EXISTS trigger_notify_assignment ON "Assignment";

CREATE OR REPLACE FUNCTION notify_assignment()
RETURNS TRIGGER AS $$
DECLARE
  nid INTEGER;
BEGIN
  -- Create notification content
  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('New assignment: ' || COALESCE(NEW."title", ''), 'ASSIGNMENT'::text, NEW."id"::text, NOW())
  RETURNING "id" INTO nid;

  -- Notify all enrolled students except the assigner
  --<> is not equal
  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead")
  SELECT nid, e."sid", FALSE
  FROM "Enrollment" e
  WHERE e."cid" = NEW."cid" AND e."sid" <> NEW."assigner_uid"
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_assignment
AFTER INSERT ON "Assignment"
FOR EACH ROW EXECUTE FUNCTION notify_assignment();

-- =========================
-- New Announcement Post
-- =========================
DROP TRIGGER IF EXISTS trigger_notify_announcement ON "Post";

CREATE OR REPLACE FUNCTION notify_announcement()
RETURNS TRIGGER AS $$
DECLARE
  nid INTEGER;
BEGIN
  -- Only notify for announcements
  IF NEW."type" IS DISTINCT FROM 'ANNOUNCEMENT'::text THEN
    RETURN NEW;
  END IF;

  -- Create notification content
  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('New announcement: ' || COALESCE(NEW."title", ''), 'ANNOUNCEMENT'::text, NEW."id"::text, NOW())
  RETURNING "id" INTO nid;

  -- Notify all enrolled students except the post owner
  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead")
  SELECT nid, e."sid", FALSE
  FROM "Enrollment" e
  WHERE e."cid" = NEW."cid" AND e."sid" <> NEW."owner_uid"
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_announcement
AFTER INSERT ON "Post"
FOR EACH ROW EXECUTE FUNCTION notify_announcement();

-- =========================
-- Submission Graded
-- =========================
DROP TRIGGER IF EXISTS trigger_notify_submission_graded ON "Submission";

CREATE OR REPLACE FUNCTION notify_submission_graded()
RETURNS TRIGGER AS $$
DECLARE
  nid INTEGER;
BEGIN
  -- Only notify on UPDATE when grade changes to non-null
  IF TG_OP <> 'UPDATE' OR NEW."grade" IS NULL OR (OLD."grade" IS NOT NULL AND OLD."grade" = NEW."grade") THEN
    RETURN NEW;
  END IF;

  -- Create notification content
  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('Your submission was graded. Score: ' || NEW."grade"::text, 'SUBMISSION_GRADED'::text, NEW."id"::text, NOW())
  RETURNING "id" INTO nid;

  -- Notify the submitting student
  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead")
  VALUES (nid, NEW."sid", FALSE)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_submission_graded
AFTER UPDATE ON "Submission"
FOR EACH ROW EXECUTE FUNCTION notify_submission_graded();

-- =========================
-- Reply to Post (Top-Level Comment)
-- =========================
DROP TRIGGER IF EXISTS trigger_notify_post_reply ON "Comment";

CREATE OR REPLACE FUNCTION notify_post_reply()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_uid INTEGER;
  nid INTEGER;
BEGIN
  -- Only for top-level comments (no parent)
  IF NEW."parent_comment_id" IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get post owner
  SELECT "owner_uid" INTO post_owner_uid FROM "Post" WHERE "id" = NEW."pid";

  -- Don't notify if post owner is the commenter
  IF post_owner_uid IS NULL OR post_owner_uid = NEW."commenter_uid" THEN
    RETURN NEW;
  END IF;

  -- Create notification content
  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('Someone replied to your post', 'COMMENT'::text, NEW."id"::text, NOW())
  RETURNING "id" INTO nid;

  -- Notify post owner
  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead")
  VALUES (nid, post_owner_uid, FALSE)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_post_reply
AFTER INSERT ON "Comment"
FOR EACH ROW EXECUTE FUNCTION notify_post_reply();

-- =========================
-- Reply to Comment (Nested Reply)
-- =========================
DROP TRIGGER IF EXISTS trigger_notify_comment_reply ON "Comment";

CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_commenter_uid INTEGER;
  nid INTEGER;
BEGIN
  -- Only for nested comments (has parent)
  IF NEW."parent_comment_id" IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get parent comment author
  SELECT "commenter_uid" INTO parent_commenter_uid FROM "Comment" WHERE "id" = NEW."parent_comment_id";

  -- Don't notify if parent author is the replier
  IF parent_commenter_uid IS NULL OR parent_commenter_uid = NEW."commenter_uid" THEN
    RETURN NEW;
  END IF;

  -- Create notification content
  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('Someone replied to your comment', 'COMMENT'::text, NEW."id"::text, NOW())
  RETURNING "id" INTO nid;

  -- Notify parent comment author
  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead")
  VALUES (nid, parent_commenter_uid, FALSE)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_comment_reply
AFTER INSERT ON "Comment"
FOR EACH ROW EXECUTE FUNCTION notify_comment_reply();

-- =========================
-- Task Assignee Invite
-- =========================
DROP TRIGGER IF EXISTS trigger_notify_task_invite ON "TaskAssignees";

CREATE OR REPLACE FUNCTION notify_task_invite()
RETURNS TRIGGER AS $$
DECLARE
  task_title TEXT;
  nid INTEGER;
BEGIN
  -- Only notify on new invites (isAccepted = false)
  IF NEW."isAccepted" IS DISTINCT FROM FALSE THEN
    RETURN NEW;
  END IF;

  -- Get task title
  SELECT "title" INTO task_title FROM "Task" WHERE "id" = NEW."tid";

  -- Create notification content
  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('You were invited to task: ' || COALESCE(task_title, ''), 'TASK_INVITE'::text, NEW."tid"::text, NOW())
  RETURNING "id" INTO nid;

  -- Notify the assignee
  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead")
  VALUES (nid, NEW."sid", FALSE)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_task_invite
AFTER INSERT ON "TaskAssignees"
FOR EACH ROW EXECUTE FUNCTION notify_task_invite();
