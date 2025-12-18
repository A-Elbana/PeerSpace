-- CreateIndex
CREATE INDEX "Post_post_date_id_idx" ON "Post"("post_date", "id");

-- CreateIndex
CREATE INDEX "Post_is_resolved_idx" ON "Post"("is_resolved");

-- CreateIndex
CREATE INDEX "PostFileAttachment_pid_idx" ON "PostFileAttachment"("pid");

-- CreateIndex
CREATE INDEX "StudentBadge_sid_idx" ON "StudentBadge"("sid");

-- CreateIndex
CREATE INDEX "Submission_sid_subm_date_idx" ON "Submission"("sid", "subm_date");

-- CreateIndex
CREATE INDEX "Submission_sid_grade_idx" ON "Submission"("sid", "grade");
