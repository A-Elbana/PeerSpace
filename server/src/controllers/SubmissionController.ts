import { Request, Response } from "express";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";
import ActivityLogService from "../services/ActivityLogService";

// Create a submission (Student only)
export const createSubmission = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { aid, fileIds, feedback } = req.body as {
    aid: number | string;
    fileIds?: Array<number | string>;
    feedback?: string | null;
  };

  const aidNum = Number(aid);
  if (!aid || Number.isNaN(aidNum)) {
    return res.status(400).json({
      message: "Assignment id (aid) is required and must be a number",
    });
  }

  try {
    // Fetch assignment to get community ID
    const assignment = await prisma.assignment.findUnique({
      where: { id: aidNum },
      select: { cid: true, title: true, canBeLate: true, due_date: true },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const currentTime = new Date();
    if (assignment.canBeLate === false && assignment.due_date && assignment.due_date < currentTime) {
      return res.status(403).json({ message: "Assignment deadline passed" });
    }

    const now = new Date();
    const submission = await prisma.submission.create({
      data: {
        aid: aidNum,
        sid: userId,
        subm_date: now,
        feedback: feedback ?? null,
      },
    });

    // Create file attachments if fileIds provided
    if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
      await prisma.submissionFileAttachment.createMany({
        data: fileIds.map((fid: string | number) => ({
          subid: submission.id,
          fid: String(fid),
        })),
        skipDuplicates: true,
      });
    }

    const result = await prisma.submission.findUnique({
      where: { id: submission.id },
      include: {
        SubmissionFileAttachment: {
          include: {
            File: {
              select: {
                id: true,
                public_id: true,
                secure_url: true,
                resource_type: true,
                format: true,
                is_private: true,
              },
            },
          },
        },
      },
    });

    // Log the activity
    await ActivityLogService.logActivity({
      userId,
      communityId: assignment.cid,
      actionType: 40, // SUBMISSION_CREATED
      description: `Submitted assignment "${assignment.title}"`,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Create Submission Error:", error);
    res.status(500).json({ message: "Failed to create submission" });
  }
};

// Get submissions for an assignment (Instructor/Admin) or student (owner)
export const getSubmissionsByAssignment = async (
  req: Request,
  res: Response
) => {
  const { aid } = req.query as any;
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(
    50,
    Math.max(1, parseInt((req.query.limit as string) || "10"))
  );
  const skip = (page - 1) * limit;

  if (!aid) {
    return res.status(400).json({ message: "Assignment id (aid) is required" });
  }

  try {
    const where = { aid: Number(aid) };
    const submissions = await prisma.submission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { subm_date: "desc" },
      include: {
        SubmissionFileAttachment: {
          include: {
            File: {
              select: {
                id: true,
                public_id: true,
                secure_url: true,
                resource_type: true,
                format: true,
                is_private: true,
              },
            },
          },
        },
        Student: { include: { User: true } },
      },
    });
    const total = await prisma.submission.count({ where });

    res.status(200).json({
      success: true,
      data: submissions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get Submissions Error:", error);
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
};

// Get my submissions (Student)
export const getMySubmissions = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(
    50,
    Math.max(1, parseInt((req.query.limit as string) || "10"))
  );
  const skip = (page - 1) * limit;

  try {
    const where = { sid: userId };
    const submissions = await prisma.submission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { subm_date: "desc" },
      include: {
        SubmissionFileAttachment: {
          include: {
            File: {
              select: {
                id: true,
                public_id: true,
                secure_url: true,
                resource_type: true,
                format: true,
                is_private: true,
              },
            },
          },
        },
        Assignment: true,
      },
    });
    const total = await prisma.submission.count({ where });

    res.status(200).json({
      success: true,
      data: submissions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get My Submissions Error:", error);
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
};

// Get a submission by id (owner, instructor managing assignment's community, or admin)
export const getSubmissionById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: Number(id) },
      include: {
        Assignment: true,
        Student: { include: { User: true } },
      },
    });
    if (!submission)
      return res.status(404).json({ message: "Submission not found" });

    // Get attached files
    const files = await prisma.file.findMany({
      where: {
        context: "SUBMISSION",
        context_id: String(submission.id),
      },
      select: {
        id: true,
        public_id: true,
        secure_url: true,
        resource_type: true,
        format: true,
        is_private: true,
        created_at: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        ...submission,
        files,
      },
    });
  } catch (error) {
    console.error("Get Submission Error:", error);
    res.status(500).json({ message: "Failed to fetch submission" });
  }
};

// Update submission (owner can update feedback or reattach files before grading)
export const updateSubmission = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { feedback, fileIds } = req.body as {
    feedback?: string | null;
    fileIds?: string[];
  };
  try {
    const submission = await prisma.submission.update({
      where: { id: Number(id) },
      data: { feedback: feedback ?? null },
    });

    // Update file attachments if fileIds provided
    if (fileIds !== undefined && Array.isArray(fileIds)) {
      // Delete existing attachments
      await prisma.submissionFileAttachment.deleteMany({
        where: { subid: submission.id },
      });

      // Create new attachments
      if (fileIds.length > 0) {
        await prisma.submissionFileAttachment.createMany({
          data: fileIds.map((fid: string) => ({
            subid: submission.id,
            fid: String(fid),
          })),
          skipDuplicates: true,
        });
      }
    }

    const result = await prisma.submission.findUnique({
      where: { id: submission.id },
      include: {
        SubmissionFileAttachment: {
          include: {
            File: {
              select: {
                id: true,
                public_id: true,
                secure_url: true,
                resource_type: true,
                format: true,
                is_private: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Update Submission Error:", error);
    res.status(500).json({ message: "Failed to update submission" });
  }
};

// Delete submission (owner or admin)
export const deleteSubmission = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Delete associated files from Cloudinary and database
    const files = await prisma.file.findMany({
      where: {
        context: "SUBMISSION",
        context_id: String(id),
      },
    });

    // Delete from Cloudinary
    const cloudinary = require("../config/cloudinary").default;
    for (const file of files) {
      try {
        await cloudinary.uploader.destroy(file.public_id);
      } catch (error) {
        console.error(
          `Failed to delete file from Cloudinary: ${file.public_id}`,
          error
        );
        // Continue with deletion even if Cloudinary fails
      }
    }

    // Delete files from database
    await prisma.file.deleteMany({
      where: {
        context: "SUBMISSION",
        context_id: String(id),
      },
    });

    // Delete deprecated file attachments
    await prisma.submissionFileAttachment.deleteMany({
      where: { subid: Number(id) },
    });

    // Delete the submission
    await prisma.submission.delete({ where: { id: Number(id) } });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete Submission Error:", error);
    res.status(500).json({ message: "Failed to delete submission" });
  }
};

// Grade submission (Instructor managing community or Admin)
export const gradeSubmission = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { grade, feedback } = req.body as {
    grade: number;
    feedback?: string | null;
  };
  try {
    const updated = await prisma.submission.update({
      where: { id: Number(id) },
      data: { grade, feedback: feedback ?? null },
      include: {
        Assignment: { select: { cid: true, max_points: true } },
      },
    });

    // Log the activity
    await ActivityLogService.logSubmissionGraded(
      (req as any).userId,
      updated.Assignment.cid,
      grade,
      updated.Assignment.max_points ?? undefined
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Grade Submission Error:", error);
    res.status(500).json({ message: "Failed to grade submission" });
  }
};
