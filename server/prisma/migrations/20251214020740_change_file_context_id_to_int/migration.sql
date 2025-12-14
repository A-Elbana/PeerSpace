/*
  Warnings:

  - Changed the type of `context_id` on the `File` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "context_id",
ADD COLUMN     "context_id" INTEGER NOT NULL;
