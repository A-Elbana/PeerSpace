-- Migration: taskassignees_notify_on_insert
-- Adds an AFTER INSERT trigger on TaskAssignees that notifies the recipient when the row represents an invite (isAccepted = false)

-- Use existing notify_single_user helper defined in earlier migrations
CREATE OR REPLACE FUNCTION notify_taskassignee_insert()
RETURNS trigger AS $$
DECLARE
  task_title text;
BEGIN
  -- If the inserted row is not accepted yet, treat it as an invitation and notify the user
  IF NEW.isAccepted = false THEN
    SELECT title INTO task_title FROM "Task" WHERE id = NEW.tid;
    PERFORM notify_single_user(NEW.sid, concat('You were invited to task: ', COALESCE(task_title, '')), 'TASK_INVITE', NEW.tid::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_taskassignee_insert ON "TaskAssignees";
CREATE TRIGGER trg_notify_taskassignee_insert
AFTER INSERT ON "TaskAssignees"
FOR EACH ROW EXECUTE PROCEDURE notify_taskassignee_insert();
