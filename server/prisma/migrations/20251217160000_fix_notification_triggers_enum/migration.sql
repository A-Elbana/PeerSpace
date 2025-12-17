-- Fix notification trigger enum casts and action types
-- Drops and recreates functions/triggers with proper NotificationType values

-- Drop existing triggers to avoid dependency errors
DROP TRIGGER IF EXISTS trigger_notify_assignment ON "Assignment";
DROP TRIGGER IF EXISTS trigger_notify_announcement ON "Post";
DROP TRIGGER IF EXISTS trigger_notify_submission_graded ON "Submission";
DROP TRIGGER IF EXISTS trigger_notify_post_reply ON "Comment";
DROP TRIGGER IF EXISTS trigger_notify_comment_reply ON "Comment";
DROP TRIGGER IF EXISTS trigger_notify_task_invite ON "TaskAssignees";

-- Drop dependent functions
DROP FUNCTION IF EXISTS notify_assignment CASCADE;
DROP FUNCTION IF EXISTS notify_announcement CASCADE;
DROP FUNCTION IF EXISTS notify_submission_graded CASCADE;
DROP FUNCTION IF EXISTS notify_post_reply CASCADE;
DROP FUNCTION IF EXISTS notify_comment_reply CASCADE;
DROP FUNCTION IF EXISTS notify_task_invite CASCADE;

-- Recreate functions with correct enum usage

CREATE OR REPLACE FUNCTION notify_assignment()
RETURNS TRIGGER AS $$
DECLARE
  nid INTEGER;
BEGIN
  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('New assignment: ' || COALESCE(NEW."title", ''), 'ASSIGNMENT'::"NotificationType", NEW."id"::text, NOW())
  RETURNING "id" INTO nid;

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

CREATE OR REPLACE FUNCTION notify_announcement()
RETURNS TRIGGER AS $$
DECLARE
  nid INTEGER;
BEGIN
  IF NEW."type" IS DISTINCT FROM 'ANNOUNCEMENT' THEN
    RETURN NEW;
  END IF;

  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('New announcement: ' || COALESCE(NEW."title", ''), 'ANNOUNCEMENT'::"NotificationType", NEW."id"::text, NOW())
  RETURNING "id" INTO nid;

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

CREATE OR REPLACE FUNCTION notify_submission_graded()
RETURNS TRIGGER AS $$
DECLARE
  nid INTEGER;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW."grade" IS NULL OR (OLD."grade" IS NOT NULL AND OLD."grade" = NEW."grade") THEN
    RETURN NEW;
  END IF;

  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('Your submission was graded. Score: ' || NEW."grade"::text, 'SUBMISSION_GRADED'::"NotificationType", NEW."id"::text, NOW())
  RETURNING "id" INTO nid;

  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead")
  VALUES (nid, NEW."sid", FALSE)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_submission_graded
AFTER UPDATE ON "Submission"
FOR EACH ROW EXECUTE FUNCTION notify_submission_graded();

CREATE OR REPLACE FUNCTION notify_post_reply()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_uid INTEGER;
  nid INTEGER;
BEGIN
  IF NEW."parent_comment_id" IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT "owner_uid" INTO post_owner_uid FROM "Post" WHERE "id" = NEW."pid";

  IF post_owner_uid IS NULL OR post_owner_uid = NEW."commenter_uid" THEN
    RETURN NEW;
  END IF;

  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('Someone replied to your post', 'REPLY'::"NotificationType", NEW."id"::text, NOW())
  RETURNING "id" INTO nid;

  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead")
  VALUES (nid, post_owner_uid, FALSE)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_post_reply
AFTER INSERT ON "Comment"
FOR EACH ROW EXECUTE FUNCTION notify_post_reply();

CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_commenter_uid INTEGER;
  nid INTEGER;
BEGIN
  IF NEW."parent_comment_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "commenter_uid" INTO parent_commenter_uid FROM "Comment" WHERE "id" = NEW."parent_comment_id";

  IF parent_commenter_uid IS NULL OR parent_commenter_uid = NEW."commenter_uid" THEN
    RETURN NEW;
  END IF;

  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('Someone replied to your comment', 'REPLY'::"NotificationType", NEW."id"::text, NOW())
  RETURNING "id" INTO nid;

  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead")
  VALUES (nid, parent_commenter_uid, FALSE)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_comment_reply
AFTER INSERT ON "Comment"
FOR EACH ROW EXECUTE FUNCTION notify_comment_reply();

CREATE OR REPLACE FUNCTION notify_task_invite()
RETURNS TRIGGER AS $$
DECLARE
  task_title TEXT;
  nid INTEGER;
BEGIN
  IF NEW."isAccepted" IS DISTINCT FROM FALSE THEN
    RETURN NEW;
  END IF;

  SELECT "title" INTO task_title FROM "Task" WHERE "id" = NEW."tid";

  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES ('You were invited to task: ' || COALESCE(task_title, ''), 'TASK_INVITE'::"NotificationType", NEW."tid"::text, NOW())
  RETURNING "id" INTO nid;

  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead")
  VALUES (nid, NEW."sid", FALSE)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_task_invite
AFTER INSERT ON "TaskAssignees"
FOR EACH ROW EXECUTE FUNCTION notify_task_invite();