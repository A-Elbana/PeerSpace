-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_associated_cid_fkey";

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_associated_uid_fkey";

-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_uid_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_assigner_uid_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_cid_fkey";

-- DropForeignKey
ALTER TABLE "AssignmentFileAttachment" DROP CONSTRAINT "AssignmentFileAttachment_aid_fkey";

-- DropForeignKey
ALTER TABLE "AssignmentFileAttachment" DROP CONSTRAINT "AssignmentFileAttachment_fid_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_commenter_uid_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_parent_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_pid_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_cid_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_sid_fkey";

-- DropForeignKey
ALTER TABLE "Instructor" DROP CONSTRAINT "Instructor_uid_fkey";

-- DropForeignKey
ALTER TABLE "Manages" DROP CONSTRAINT "Manages_cid_fkey";

-- DropForeignKey
ALTER TABLE "Manages" DROP CONSTRAINT "Manages_iid_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_notebook_id_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_owner_uid_fkey";

-- DropForeignKey
ALTER TABLE "NoteFileAttachment" DROP CONSTRAINT "NoteFileAttachment_fid_fkey";

-- DropForeignKey
ALTER TABLE "NoteFileAttachment" DROP CONSTRAINT "NoteFileAttachment_nid_fkey";

-- DropForeignKey
ALTER TABLE "Notebook" DROP CONSTRAINT "Notebook_owner_uid_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_cid_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_owner_uid_fkey";

-- DropForeignKey
ALTER TABLE "PostFileAttachment" DROP CONSTRAINT "PostFileAttachment_fid_fkey";

-- DropForeignKey
ALTER TABLE "PostFileAttachment" DROP CONSTRAINT "PostFileAttachment_pid_fkey";

-- DropForeignKey
ALTER TABLE "PostNoteAttachment" DROP CONSTRAINT "PostNoteAttachment_nid_fkey";

-- DropForeignKey
ALTER TABLE "PostNoteAttachment" DROP CONSTRAINT "PostNoteAttachment_pid_fkey";

-- DropForeignKey
ALTER TABLE "PostTag" DROP CONSTRAINT "PostTag_post_id_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_cid_fkey";

-- DropForeignKey
ALTER TABLE "StudentBadge" DROP CONSTRAINT "StudentBadge_bid_fkey";

-- DropForeignKey
ALTER TABLE "StudentBadge" DROP CONSTRAINT "StudentBadge_sid_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_aid_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_sid_fkey";

-- DropForeignKey
ALTER TABLE "SubmissionFileAttachment" DROP CONSTRAINT "SubmissionFileAttachment_fid_fkey";

-- DropForeignKey
ALTER TABLE "SubmissionFileAttachment" DROP CONSTRAINT "SubmissionFileAttachment_subid_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_author_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_parent_task_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignees" DROP CONSTRAINT "TaskAssignees_sid_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignees" DROP CONSTRAINT "TaskAssignees_tid_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignmentRelation" DROP CONSTRAINT "TaskAssignmentRelation_aid_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignmentRelation" DROP CONSTRAINT "TaskAssignmentRelation_tid_fkey";

-- DropForeignKey
ALTER TABLE "TaskTag" DROP CONSTRAINT "TaskTag_task_id_fkey";

-- DropForeignKey
ALTER TABLE "Voted" DROP CONSTRAINT "Voted_pid_fkey";

-- DropForeignKey
ALTER TABLE "Voted" DROP CONSTRAINT "Voted_sid_fkey";

-- AlterTable
CREATE SEQUENCE activitylog_id_seq;
ALTER TABLE "ActivityLog" ALTER COLUMN "id" SET DEFAULT nextval('activitylog_id_seq');
ALTER SEQUENCE activitylog_id_seq OWNED BY "ActivityLog"."id";

-- AlterTable
CREATE SEQUENCE badge_id_seq;
ALTER TABLE "Badge" ALTER COLUMN "id" SET DEFAULT nextval('badge_id_seq');
ALTER SEQUENCE badge_id_seq OWNED BY "Badge"."id";

-- AlterTable
CREATE SEQUENCE comment_id_seq;
ALTER TABLE "Comment" ALTER COLUMN "id" SET DEFAULT nextval('comment_id_seq');
ALTER SEQUENCE comment_id_seq OWNED BY "Comment"."id";

-- AlterTable
CREATE SEQUENCE file_id_seq;
ALTER TABLE "File" ALTER COLUMN "id" SET DEFAULT nextval('file_id_seq');
ALTER SEQUENCE file_id_seq OWNED BY "File"."id";

-- AlterTable
CREATE SEQUENCE note_id_seq;
ALTER TABLE "Note" ALTER COLUMN "id" SET DEFAULT nextval('note_id_seq');
ALTER SEQUENCE note_id_seq OWNED BY "Note"."id";

-- AlterTable
CREATE SEQUENCE notebook_id_seq;
ALTER TABLE "Notebook" ALTER COLUMN "id" SET DEFAULT nextval('notebook_id_seq');
ALTER SEQUENCE notebook_id_seq OWNED BY "Notebook"."id";

-- AlterTable
CREATE SEQUENCE task_id_seq;
ALTER TABLE "Task" ALTER COLUMN "id" SET DEFAULT nextval('task_id_seq');
ALTER SEQUENCE task_id_seq OWNED BY "Task"."id";

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_associated_cid_fkey" FOREIGN KEY ("associated_cid") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_associated_uid_fkey" FOREIGN KEY ("associated_uid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_uid_fkey" FOREIGN KEY ("uid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assigner_uid_fkey" FOREIGN KEY ("assigner_uid") REFERENCES "Instructor"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentFileAttachment" ADD CONSTRAINT "AssignmentFileAttachment_aid_fkey" FOREIGN KEY ("aid") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentFileAttachment" ADD CONSTRAINT "AssignmentFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_commenter_uid_fkey" FOREIGN KEY ("commenter_uid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_pid_fkey" FOREIGN KEY ("pid") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_sid_fkey" FOREIGN KEY ("sid") REFERENCES "Student"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_uid_fkey" FOREIGN KEY ("uid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manages" ADD CONSTRAINT "Manages_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manages" ADD CONSTRAINT "Manages_iid_fkey" FOREIGN KEY ("iid") REFERENCES "Instructor"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_owner_uid_fkey" FOREIGN KEY ("owner_uid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteFileAttachment" ADD CONSTRAINT "NoteFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteFileAttachment" ADD CONSTRAINT "NoteFileAttachment_nid_fkey" FOREIGN KEY ("nid") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notebook" ADD CONSTRAINT "Notebook_owner_uid_fkey" FOREIGN KEY ("owner_uid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_owner_uid_fkey" FOREIGN KEY ("owner_uid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostFileAttachment" ADD CONSTRAINT "PostFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostFileAttachment" ADD CONSTRAINT "PostFileAttachment_pid_fkey" FOREIGN KEY ("pid") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostNoteAttachment" ADD CONSTRAINT "PostNoteAttachment_nid_fkey" FOREIGN KEY ("nid") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostNoteAttachment" ADD CONSTRAINT "PostNoteAttachment_pid_fkey" FOREIGN KEY ("pid") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_bid_fkey" FOREIGN KEY ("bid") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_sid_fkey" FOREIGN KEY ("sid") REFERENCES "Student"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_aid_fkey" FOREIGN KEY ("aid") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_sid_fkey" FOREIGN KEY ("sid") REFERENCES "Student"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFileAttachment" ADD CONSTRAINT "SubmissionFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFileAttachment" ADD CONSTRAINT "SubmissionFileAttachment_subid_fkey" FOREIGN KEY ("subid") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_author_fkey" FOREIGN KEY ("author") REFERENCES "Student"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parent_task_fkey" FOREIGN KEY ("parent_task") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignees" ADD CONSTRAINT "TaskAssignees_sid_fkey" FOREIGN KEY ("sid") REFERENCES "Student"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignees" ADD CONSTRAINT "TaskAssignees_tid_fkey" FOREIGN KEY ("tid") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignmentRelation" ADD CONSTRAINT "TaskAssignmentRelation_aid_fkey" FOREIGN KEY ("aid") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignmentRelation" ADD CONSTRAINT "TaskAssignmentRelation_tid_fkey" FOREIGN KEY ("tid") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voted" ADD CONSTRAINT "Voted_pid_fkey" FOREIGN KEY ("pid") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voted" ADD CONSTRAINT "Voted_sid_fkey" FOREIGN KEY ("sid") REFERENCES "Student"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
