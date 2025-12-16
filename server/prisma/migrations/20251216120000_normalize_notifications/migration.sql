-- Migration: normalize_notifications
-- Create normalized NotificationContent and UserNotification and migrate existing data

BEGIN;

-- 1) Create NotificationContent table
CREATE TABLE IF NOT EXISTS "NotificationContent" (
  "id" SERIAL PRIMARY KEY,
  "message" VARCHAR NOT NULL,
  "type" "NotificationType" NOT NULL,
  "resourceId" VARCHAR,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2) Create UserNotification table
CREATE TABLE IF NOT EXISTS "UserNotification" (
  "id" SERIAL PRIMARY KEY,
  "notificationId" INTEGER NOT NULL,
  "recipientId" INTEGER NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false
);

-- Foreign keys
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "NotificationContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_usernotification_recipient" ON "UserNotification"("recipientId");
CREATE INDEX IF NOT EXISTS "idx_usernotification_recipient_isRead" ON "UserNotification"("recipientId", "isRead");

-- 3) Migrate existing data from old Notification table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Notification') THEN
    -- Insert content rows (avoid duplicates by using the existing id values)
    INSERT INTO "NotificationContent" ("id", "message", "type", "resourceId", "createdAt")
    SELECT "id", "message", "type", "resourceId", "createdAt" FROM "Notification";

    -- Insert user associations preserving id where possible
    INSERT INTO "UserNotification" ("id", "notificationId", "recipientId", "isRead")
    SELECT "id", "id", "recipientId", "isRead" FROM "Notification";

    -- Ensure sequences for serial columns continue after inserted ids
    PERFORM setval(pg_get_serial_sequence('"NotificationContent"','id'), COALESCE((SELECT MAX("id") FROM "NotificationContent"), 1));
    PERFORM setval(pg_get_serial_sequence('"UserNotification"','id'), COALESCE((SELECT MAX("id") FROM "UserNotification"), 1));

    -- Drop the old Notification table
    DROP TABLE "Notification";
  END IF;
END$$;

COMMIT;
