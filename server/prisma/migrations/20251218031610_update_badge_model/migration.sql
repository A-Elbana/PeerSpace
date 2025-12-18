/*
  Warnings:

  - You are about to drop the column `icon_url` on the `Badge` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- AlterTable
ALTER TABLE "Badge" DROP COLUMN "icon_url",
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" VARCHAR,
ADD COLUMN     "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON';

-- CreateIndex
CREATE INDEX "Badge_rarity_idx" ON "Badge"("rarity");
