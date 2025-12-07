-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" INTEGER NOT NULL,
    "date" TIMESTAMP(6),
    "associated_uid" INTEGER NOT NULL,
    "associated_cid" INTEGER,
    "description" VARCHAR,
    "action_type" INTEGER,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "uid" INTEGER NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "due_date" TIMESTAMP(6),
    "max_points" DOUBLE PRECISION,
    "assigner_uid" INTEGER NOT NULL,
    "cid" INTEGER NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentFileAttachment" (
    "aid" INTEGER,
    "fid" INTEGER NOT NULL,

    CONSTRAINT "AssignmentFileAttachment_pkey" PRIMARY KEY ("fid")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "icon_url" VARCHAR NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" INTEGER NOT NULL,
    "pid" INTEGER NOT NULL,
    "content" VARCHAR NOT NULL,
    "approved_by_inst" BOOLEAN NOT NULL,
    "approved_by_op" BOOLEAN NOT NULL,
    "approved_at_inst" TIMESTAMP(6),
    "approved_at_op" TIMESTAMP(6),
    "comment_date" TIMESTAMP(6) NOT NULL,
    "commenter_uid" INTEGER NOT NULL,
    "parent_comment_pid" INTEGER,
    "parent_comment_id" INTEGER,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" VARCHAR,
    "type" VARCHAR NOT NULL,
    "banner_url" VARCHAR,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "cid" INTEGER NOT NULL,
    "sid" INTEGER NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("cid","sid")
);

-- CreateTable
CREATE TABLE "File" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "storage_url" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL,
    "description" VARCHAR,
    "size" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instructor" (
    "uid" INTEGER NOT NULL,
    "title" VARCHAR,
    "area_of_expertise" VARCHAR,
    "google_scholar_link" VARCHAR,

    CONSTRAINT "Instructor_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Manages" (
    "iid" INTEGER NOT NULL,
    "cid" INTEGER NOT NULL,

    CONSTRAINT "Manages_pkey" PRIMARY KEY ("iid","cid")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "body" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6),
    "owner_uid" INTEGER NOT NULL,
    "notebook_id" INTEGER,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteFileAttachment" (
    "nid" INTEGER,
    "fid" INTEGER NOT NULL,

    CONSTRAINT "NoteFileAttachment_pkey" PRIMARY KEY ("fid")
);

-- CreateTable
CREATE TABLE "Notebook" (
    "id" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6),
    "owner_uid" INTEGER NOT NULL,

    CONSTRAINT "Notebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL,
    "post_date" TIMESTAMP(6) NOT NULL,
    "body" VARCHAR,
    "is_resolved" BOOLEAN,
    "owner_uid" INTEGER NOT NULL,
    "cid" INTEGER NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostFileAttachment" (
    "pid" INTEGER,
    "fid" INTEGER NOT NULL,

    CONSTRAINT "PostFileAttachment_pkey" PRIMARY KEY ("fid")
);

-- CreateTable
CREATE TABLE "PostNoteAttachment" (
    "pid" INTEGER NOT NULL,
    "nid" INTEGER NOT NULL,

    CONSTRAINT "PostNoteAttachment_pkey" PRIMARY KEY ("pid","nid")
);

-- CreateTable
CREATE TABLE "PostTag" (
    "post_id" INTEGER NOT NULL,
    "tag" VARCHAR NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("post_id","tag")
);

-- CreateTable
CREATE TABLE "Session" (
    "cid" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "start_time" TIMESTAMP(6) NOT NULL,
    "meet_url" VARCHAR NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("cid")
);

-- CreateTable
CREATE TABLE "Student" (
    "uid" INTEGER NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "StudentBadge" (
    "sid" INTEGER NOT NULL,
    "bid" INTEGER NOT NULL,

    CONSTRAINT "StudentBadge_pkey" PRIMARY KEY ("sid","bid")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" INTEGER NOT NULL,
    "subm_date" TIMESTAMP(6) NOT NULL,
    "grade" DOUBLE PRECISION,
    "feedback" VARCHAR,
    "aid" INTEGER NOT NULL,
    "sid" INTEGER NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionFileAttachment" (
    "subid" INTEGER,
    "fid" INTEGER NOT NULL,

    CONSTRAINT "SubmissionFileAttachment_pkey" PRIMARY KEY ("fid")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" VARCHAR,
    "priority" INTEGER,
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "status" INTEGER NOT NULL,
    "author" INTEGER NOT NULL,
    "parent_task" INTEGER,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignees" (
    "tid" INTEGER NOT NULL,
    "sid" INTEGER NOT NULL,

    CONSTRAINT "TaskAssignees_pkey" PRIMARY KEY ("tid","sid")
);

-- CreateTable
CREATE TABLE "TaskAssignmentRelation" (
    "aid" INTEGER,
    "tid" INTEGER NOT NULL,

    CONSTRAINT "TaskAssignmentRelation_pkey" PRIMARY KEY ("tid")
);

-- CreateTable
CREATE TABLE "TaskTag" (
    "task_id" INTEGER NOT NULL,
    "tag" VARCHAR NOT NULL,

    CONSTRAINT "TaskTag_pkey" PRIMARY KEY ("task_id","tag")
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL,
    "email" VARCHAR NOT NULL,
    "fname" VARCHAR NOT NULL,
    "lname" VARCHAR NOT NULL,
    "activated" BOOLEAN NOT NULL,
    "hashedPassword" VARCHAR NOT NULL,
    "role" "Role" DEFAULT 'STUDENT',
    "token_hash" VARCHAR,
    "avatar_url" VARCHAR,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voted" (
    "sid" INTEGER NOT NULL,
    "pid" INTEGER NOT NULL,
    "voteType" BOOLEAN NOT NULL,

    CONSTRAINT "Voted_pkey" PRIMARY KEY ("sid","pid")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_associated_cid_fkey" FOREIGN KEY ("associated_cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_associated_uid_fkey" FOREIGN KEY ("associated_uid") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_uid_fkey" FOREIGN KEY ("uid") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assigner_uid_fkey" FOREIGN KEY ("assigner_uid") REFERENCES "Instructor"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AssignmentFileAttachment" ADD CONSTRAINT "AssignmentFileAttachment_aid_fkey" FOREIGN KEY ("aid") REFERENCES "Assignment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AssignmentFileAttachment" ADD CONSTRAINT "AssignmentFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_commenter_uid_fkey" FOREIGN KEY ("commenter_uid") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "Comment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_pid_fkey" FOREIGN KEY ("pid") REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_sid_fkey" FOREIGN KEY ("sid") REFERENCES "Student"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_uid_fkey" FOREIGN KEY ("uid") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Manages" ADD CONSTRAINT "Manages_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Manages" ADD CONSTRAINT "Manages_iid_fkey" FOREIGN KEY ("iid") REFERENCES "Instructor"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "Notebook"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_owner_uid_fkey" FOREIGN KEY ("owner_uid") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NoteFileAttachment" ADD CONSTRAINT "NoteFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NoteFileAttachment" ADD CONSTRAINT "NoteFileAttachment_nid_fkey" FOREIGN KEY ("nid") REFERENCES "Note"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Notebook" ADD CONSTRAINT "Notebook_owner_uid_fkey" FOREIGN KEY ("owner_uid") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_owner_uid_fkey" FOREIGN KEY ("owner_uid") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PostFileAttachment" ADD CONSTRAINT "PostFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PostFileAttachment" ADD CONSTRAINT "PostFileAttachment_pid_fkey" FOREIGN KEY ("pid") REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PostNoteAttachment" ADD CONSTRAINT "PostNoteAttachment_nid_fkey" FOREIGN KEY ("nid") REFERENCES "Note"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PostNoteAttachment" ADD CONSTRAINT "PostNoteAttachment_pid_fkey" FOREIGN KEY ("pid") REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Community"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_uid_fkey" FOREIGN KEY ("uid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_bid_fkey" FOREIGN KEY ("bid") REFERENCES "Badge"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_sid_fkey" FOREIGN KEY ("sid") REFERENCES "Student"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_aid_fkey" FOREIGN KEY ("aid") REFERENCES "Assignment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_sid_fkey" FOREIGN KEY ("sid") REFERENCES "Student"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubmissionFileAttachment" ADD CONSTRAINT "SubmissionFileAttachment_fid_fkey" FOREIGN KEY ("fid") REFERENCES "File"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SubmissionFileAttachment" ADD CONSTRAINT "SubmissionFileAttachment_subid_fkey" FOREIGN KEY ("subid") REFERENCES "Submission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_author_fkey" FOREIGN KEY ("author") REFERENCES "Student"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parent_task_fkey" FOREIGN KEY ("parent_task") REFERENCES "Task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TaskAssignees" ADD CONSTRAINT "TaskAssignees_sid_fkey" FOREIGN KEY ("sid") REFERENCES "Student"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TaskAssignees" ADD CONSTRAINT "TaskAssignees_tid_fkey" FOREIGN KEY ("tid") REFERENCES "Task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TaskAssignmentRelation" ADD CONSTRAINT "TaskAssignmentRelation_aid_fkey" FOREIGN KEY ("aid") REFERENCES "Assignment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TaskAssignmentRelation" ADD CONSTRAINT "TaskAssignmentRelation_tid_fkey" FOREIGN KEY ("tid") REFERENCES "Task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Voted" ADD CONSTRAINT "Voted_pid_fkey" FOREIGN KEY ("pid") REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Voted" ADD CONSTRAINT "Voted_sid_fkey" FOREIGN KEY ("sid") REFERENCES "Student"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION;
