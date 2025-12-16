-- Migration: add_notification_triggers
-- Creates PL/pgSQL trigger functions to auto-create notifications for key events
-- Migration: add_notification_triggers (updated to insert into normalized tables)

-- Helper: create a NotificationContent row and return its id
CREATE OR REPLACE FUNCTION create_notification_content(msg text, ntype text, resource text DEFAULT NULL)
RETURNS integer AS $$
DECLARE
  nid integer;
BEGIN
  INSERT INTO "NotificationContent" ("message", "type", "resourceId", "createdAt")
  VALUES (msg, ntype::"NotificationType", resource, now())
  RETURNING id INTO nid;
  RETURN nid;
END;
$$ LANGUAGE plpgsql;

-- Helper: create content and a single user notification
CREATE OR REPLACE FUNCTION notify_single_user(recipient integer, msg text, ntype text, resource text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  nid integer;
BEGIN
  nid := create_notification_content(msg, ntype, resource);
  INSERT INTO "UserNotification" ("notificationId", "recipientId", "isRead") VALUES (nid, recipient, false);
END;
$$ LANGUAGE plpgsql;

-- Helper: create content and notify multiple recipients from a SELECT
CREATE OR REPLACE FUNCTION notify_multiple_users(msg text, ntype text, recipient_query text, resource text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  nid integer;
  sql text;
BEGIN
  nid := create_notification_content(msg, ntype, resource);
  -- recipient_query is expected to be a SQL SELECT returning integer recipient ids
  sql := 'INSERT INTO "UserNotification" ("notificationId","recipientId","isRead") SELECT ' || nid || ', uid, false FROM (' || recipient_query || ') AS t(uid)';
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- 1) New Assignment -> notify enrolled students (except assigner)
CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS trigger AS $$
DECLARE
  recipient_sql text;
BEGIN
  recipient_sql := format('SELECT e.sid FROM "Enrollment" e WHERE e.cid = %L AND e.sid <> %s', NEW.cid, NEW.assigner_uid);
  PERFORM notify_multiple_users(concat('New assignment: ', NEW.title), 'ASSIGNMENT', recipient_sql, NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_new_assignment ON "Assignment";
CREATE TRIGGER trg_notify_new_assignment
AFTER INSERT ON "Assignment"
FOR EACH ROW EXECUTE PROCEDURE notify_new_assignment();

-- 2) New Announcement Post -> notify enrolled students (except post owner)
CREATE OR REPLACE FUNCTION notify_new_announcement_post()
RETURNS trigger AS $$
DECLARE
  recipient_sql text;
BEGIN
  IF LOWER(NEW.type) = 'announcement' THEN
    recipient_sql := format('SELECT e.sid FROM "Enrollment" e WHERE e.cid = %L AND e.sid <> %s', NEW.cid, NEW.owner_uid);
    PERFORM notify_multiple_users(concat('New announcement: ', COALESCE(NEW.title, '')), 'ANNOUNCEMENT', recipient_sql, NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_new_announcement ON "Post";
CREATE TRIGGER trg_notify_new_announcement
AFTER INSERT ON "Post"
FOR EACH ROW EXECUTE PROCEDURE notify_new_announcement_post();

-- 3) Submission graded -> notify the submitting student when grade is set/updated
CREATE OR REPLACE FUNCTION notify_submission_graded()
RETURNS trigger AS $$
BEGIN
  -- Only notify when a grade is newly set or changed to a non-null value
  IF (TG_OP = 'UPDATE' AND NEW.grade IS NOT NULL AND (OLD.grade IS NULL OR OLD.grade <> NEW.grade)) THEN
    PERFORM notify_single_user(NEW.sid, concat('Your submission was graded (Submission ID: ', NEW.id::text, ')'), 'SUBMISSION_GRADED', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_submission_graded ON "Submission";
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
      PERFORM notify_single_user(parent_uid, 'Someone replied to your comment', 'REPLY', NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_reply_to_comment ON "Comment";
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
      PERFORM notify_single_user(post_owner, 'Someone replied to your post', 'REPLY', NEW.pid::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_reply_to_post ON "Comment";
CREATE TRIGGER trg_notify_reply_to_post
AFTER INSERT ON "Comment"
FOR EACH ROW EXECUTE PROCEDURE notify_reply_to_post();

-- Safety notes: The triggers attempt to avoid notifying the actor themselves.
-- If you want to tune message content or recipient selection (e.g. only instructors), adapt the SELECT/WHERE clauses.
