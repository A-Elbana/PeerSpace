-- Ensure idempotency: drop trigger if exists before creating
DROP TRIGGER IF EXISTS trigger_check_social ON "Enrollment";

-- Create or replace the badge award function
CREATE OR REPLACE FUNCTION check_community_badges()
RETURNS TRIGGER AS $$
DECLARE
  comm_count INT;
  badge_id_var INT;
  target_badge_code TEXT := 'SOCIAL_BUTTERFLY_5';
  required_count INT := 2;
BEGIN
  -- Count enrollments for the student in the Enrollment table
  SELECT COUNT(*) INTO comm_count
  FROM "Enrollment"
  WHERE "sid" = NEW."sid";

  -- If the student meets the threshold, assign the target badge
  IF comm_count >= required_count THEN
    SELECT "id" INTO badge_id_var FROM "Badge" WHERE "name" = target_badge_code;

    IF badge_id_var IS NOT NULL THEN
      INSERT INTO "StudentBadge" ("sid", "bid")
      VALUES (NEW."sid", badge_id_var)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the function to the Enrollment table on inserts
CREATE TRIGGER trigger_check_social
AFTER INSERT ON "Enrollment"
FOR EACH ROW
EXECUTE FUNCTION check_community_badges();