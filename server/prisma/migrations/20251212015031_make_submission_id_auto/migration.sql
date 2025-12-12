-- AlterTable
CREATE SEQUENCE assignment_id_seq;
ALTER TABLE "Assignment" ALTER COLUMN "id" SET DEFAULT nextval('assignment_id_seq');
ALTER SEQUENCE assignment_id_seq OWNED BY "Assignment"."id";

-- AlterTable
CREATE SEQUENCE submission_id_seq;
ALTER TABLE "Submission" ALTER COLUMN "id" SET DEFAULT nextval('submission_id_seq');
ALTER SEQUENCE submission_id_seq OWNED BY "Submission"."id";
