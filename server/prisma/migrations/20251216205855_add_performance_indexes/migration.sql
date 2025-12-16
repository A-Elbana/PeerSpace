-- CreateIndex
CREATE INDEX "ActivityLog_associated_uid_idx" ON "ActivityLog"("associated_uid");

-- CreateIndex
CREATE INDEX "ActivityLog_associated_cid_idx" ON "ActivityLog"("associated_cid");

-- CreateIndex
CREATE INDEX "ActivityLog_date_idx" ON "ActivityLog"("date");

-- CreateIndex
CREATE INDEX "Assignment_cid_idx" ON "Assignment"("cid");

-- CreateIndex
CREATE INDEX "Assignment_assigner_uid_idx" ON "Assignment"("assigner_uid");

-- CreateIndex
CREATE INDEX "Assignment_due_date_idx" ON "Assignment"("due_date");

-- CreateIndex
CREATE INDEX "Assignment_cid_due_date_idx" ON "Assignment"("cid", "due_date");

-- CreateIndex
CREATE INDEX "Comment_pid_idx" ON "Comment"("pid");

-- CreateIndex
CREATE INDEX "Comment_commenter_uid_idx" ON "Comment"("commenter_uid");

-- CreateIndex
CREATE INDEX "Comment_parent_comment_id_idx" ON "Comment"("parent_comment_id");

-- CreateIndex
CREATE INDEX "Comment_comment_date_idx" ON "Comment"("comment_date");

-- CreateIndex
CREATE INDEX "Comment_pid_isDeleted_idx" ON "Comment"("pid", "isDeleted");

-- CreateIndex
CREATE INDEX "Community_type_idx" ON "Community"("type");

-- CreateIndex
CREATE INDEX "Community_name_idx" ON "Community"("name");

-- CreateIndex
CREATE INDEX "Community_banner_file_id_idx" ON "Community"("banner_file_id");

-- CreateIndex
CREATE INDEX "Enrollment_sid_idx" ON "Enrollment"("sid");

-- CreateIndex
CREATE INDEX "Enrollment_cid_idx" ON "Enrollment"("cid");

-- CreateIndex
CREATE INDEX "Manages_iid_idx" ON "Manages"("iid");

-- CreateIndex
CREATE INDEX "Manages_cid_idx" ON "Manages"("cid");

-- CreateIndex
CREATE INDEX "Note_owner_uid_idx" ON "Note"("owner_uid");

-- CreateIndex
CREATE INDEX "Note_notebook_id_idx" ON "Note"("notebook_id");

-- CreateIndex
CREATE INDEX "Note_created_at_idx" ON "Note"("created_at");

-- CreateIndex
CREATE INDEX "Notebook_owner_uid_idx" ON "Notebook"("owner_uid");

-- CreateIndex
CREATE INDEX "Post_cid_idx" ON "Post"("cid");

-- CreateIndex
CREATE INDEX "Post_owner_uid_idx" ON "Post"("owner_uid");

-- CreateIndex
CREATE INDEX "Post_post_date_idx" ON "Post"("post_date");

-- CreateIndex
CREATE INDEX "Post_cid_post_date_idx" ON "Post"("cid", "post_date");

-- CreateIndex
CREATE INDEX "Post_title_idx" ON "Post"("title");

-- CreateIndex
CREATE INDEX "Post_type_idx" ON "Post"("type");

-- CreateIndex
CREATE INDEX "PostTag_tag_idx" ON "PostTag"("tag");

-- CreateIndex
CREATE INDEX "PostTag_post_id_idx" ON "PostTag"("post_id");

-- CreateIndex
CREATE INDEX "Submission_aid_idx" ON "Submission"("aid");

-- CreateIndex
CREATE INDEX "Submission_sid_idx" ON "Submission"("sid");

-- CreateIndex
CREATE INDEX "Submission_subm_date_idx" ON "Submission"("subm_date");

-- CreateIndex
CREATE INDEX "Submission_sid_aid_idx" ON "Submission"("sid", "aid");

-- CreateIndex
CREATE INDEX "Task_author_idx" ON "Task"("author");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_end_date_idx" ON "Task"("end_date");

-- CreateIndex
CREATE INDEX "Task_parent_task_idx" ON "Task"("parent_task");

-- CreateIndex
CREATE INDEX "TaskAssignees_sid_idx" ON "TaskAssignees"("sid");

-- CreateIndex
CREATE INDEX "TaskAssignees_tid_idx" ON "TaskAssignees"("tid");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_avatar_file_id_idx" ON "User"("avatar_file_id");

-- CreateIndex
CREATE INDEX "Voted_pid_idx" ON "Voted"("pid");

-- CreateIndex
CREATE INDEX "Voted_sid_idx" ON "Voted"("sid");

-- CreateIndex
CREATE INDEX "Voted_pid_voteType_idx" ON "Voted"("pid", "voteType");
