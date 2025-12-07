-- AlterTable
CREATE SEQUENCE user_id_seq;
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT nextval('user_id_seq'),
ALTER COLUMN "activated" SET DEFAULT true;
ALTER SEQUENCE user_id_seq OWNED BY "User"."id";
