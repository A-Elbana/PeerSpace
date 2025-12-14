/*
  Warnings:

  - The primary key for the `AssignmentFileAttachment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `File` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `description` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `storage_url` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `File` table. All the data in the column will be lost.
  - The primary key for the `NoteFileAttachment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PostFileAttachment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SubmissionFileAttachment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `fid` on the `AssignmentFileAttachment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `context` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `context_id` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `public_id` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resource_type` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secure_url` to the `File` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `File` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fid` on the `NoteFileAttachment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fid` on the `PostFileAttachment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fid` on the `SubmissionFileAttachment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "AssignmentFileAttachment" DROP CONSTRAINT "AssignmentFileAttachment_fid_fkey";

-- DropForeignKey
ALTER TABLE "NoteFileAttachment" DROP CONSTRAINT "NoteFileAttachment_fid_fkey";

-- DropForeignKey
ALTER TABLE "PostFileAttachment" DROP CONSTRAINT "PostFileAttachment_fid_fkey";

-- DropForeignKey
ALTER TABLE "SubmissionFileAttachment" DROP CONSTRAINT "SubmissionFileAttachment_fid_fkey";

-- AlterTable
ALTER TABLE "AssignmentFileAttachment" DROP CONSTRAINT "AssignmentFileAttachment_pkey",
DROP COLUMN "fid",
ADD COLUMN     "fid" UUID NOT NULL,
ADD CONSTRAINT "AssignmentFileAttachment_pkey" PRIMARY KEY ("fid");

-- AlterTable
ALTER TABLE "File" DROP CONSTRAINT "File_pkey",
DROP COLUMN "description",
DROP COLUMN "name",
DROP COLUMN "size",
DROP COLUMN "storage_url",
DROP COLUMN "type",
ADD COLUMN     "context" TEXT NOT NULL,
ADD COLUMN     "context_id" UUID NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "is_private" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "public_id" TEXT NOT NULL,
ADD COLUMN     "resource_type" TEXT NOT NULL,
ADD COLUMN     "secure_url" TEXT NOT NULL,
ADD COLUMN     "uploader_id" INTEGER,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "File_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "NoteFileAttachment" DROP CONSTRAINT "NoteFileAttachment_pkey",
DROP COLUMN "fid",
ADD COLUMN     "fid" UUID NOT NULL,
ADD CONSTRAINT "NoteFileAttachment_pkey" PRIMARY KEY ("fid");

-- AlterTable
ALTER TABLE "PostFileAttachment" DROP CONSTRAINT "PostFileAttachment_pkey",
DROP COLUMN "fid",
ADD COLUMN     "fid" UUID NOT NULL,
ADD CONSTRAINT "PostFileAttachment_pkey" PRIMARY KEY ("fid");

-- AlterTable
ALTER TABLE "SubmissionFileAttachment" DROP CONSTRAINT "SubmissionFileAttachment_pkey",
DROP COLUMN "fid",
ADD COLUMN     "fid" UUID NOT NULL,
ADD CONSTRAINT "SubmissionFileAttachment_pkey" PRIMARY KEY ("fid");

-- AddForeignKey
ALTER TABLE "AssignmentFileAttachment" ADD CONSTRAINT "AssignmentFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteFileAttachment" ADD CONSTRAINT "NoteFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostFileAttachment" ADD CONSTRAINT "PostFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFileAttachment" ADD CONSTRAINT "SubmissionFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
