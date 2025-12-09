/*
  Warnings:

  - The `associated_cid` column on the `ActivityLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Community` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Enrollment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Manages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `cid` on the `Assignment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Community` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `cid` on the `Enrollment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `cid` on the `Manages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `cid` on the `Post` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `cid` on the `Session` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_associated_cid_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_cid_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_cid_fkey";

-- DropForeignKey
ALTER TABLE "Manages" DROP CONSTRAINT "Manages_cid_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_cid_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_cid_fkey";

-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "associated_cid",
ADD COLUMN     "associated_cid" UUID;

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "cid",
ADD COLUMN     "cid" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Community" DROP CONSTRAINT "Community_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "Community_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_pkey",
DROP COLUMN "cid",
ADD COLUMN     "cid" UUID NOT NULL,
ADD CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("cid", "sid");

-- AlterTable
ALTER TABLE "Manages" DROP CONSTRAINT "Manages_pkey",
DROP COLUMN "cid",
ADD COLUMN     "cid" UUID NOT NULL,
ADD CONSTRAINT "Manages_pkey" PRIMARY KEY ("iid", "cid");

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "cid",
ADD COLUMN     "cid" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP CONSTRAINT "Session_pkey",
DROP COLUMN "cid",
ADD COLUMN     "cid" UUID NOT NULL,
ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("cid");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_associated_cid_fkey" FOREIGN KEY ("associated_cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Manages" ADD CONSTRAINT "Manages_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
