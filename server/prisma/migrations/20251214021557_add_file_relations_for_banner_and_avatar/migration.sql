/*
  Warnings:

  - You are about to drop the column `banner_url` on the `Community` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_url` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FileContext" ADD VALUE 'COMMUNITY_BANNER';
ALTER TYPE "FileContext" ADD VALUE 'USER_AVATAR';

-- AlterTable
ALTER TABLE "Community" DROP COLUMN "banner_url",
ADD COLUMN     "banner_file_id" UUID;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar_url",
ADD COLUMN     "avatar_file_id" UUID;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_banner_file_id_fkey" FOREIGN KEY ("banner_file_id") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatar_file_id_fkey" FOREIGN KEY ("avatar_file_id") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
