/*
  Warnings:

  - Changed the type of `context` on the `File` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "FileContext" AS ENUM ('POST', 'SUBMISSION', 'NOTE', 'ASSIGNMENT');

-- AlterTable
ALTER TABLE "File" DROP COLUMN "context",
ADD COLUMN     "context" "FileContext" NOT NULL;
