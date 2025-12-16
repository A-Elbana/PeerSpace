-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_associated_cid_fkey";

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_associated_cid_fkey" FOREIGN KEY ("associated_cid") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
