/*
  Warnings:

  - Changed the type of `type` on the `Community` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CommunityType" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "Community" DROP COLUMN "type",
ADD COLUMN     "type" "CommunityType" NOT NULL;

-- AlterTable
CREATE SEQUENCE post_id_seq;
ALTER TABLE "Post" ALTER COLUMN "id" SET DEFAULT nextval('post_id_seq');
ALTER SEQUENCE post_id_seq OWNED BY "Post"."id";
