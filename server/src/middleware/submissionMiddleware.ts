import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";

export const loadSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = Number(req.params.id);
  if (isNaN(id))
    return res.status(400).json({ message: "Invalid submission id" });
  try {
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        Assignment: { include: { Community: true, Instructor: true } },
        Student: true,
      },
    });
    if (!submission)
      return res.status(404).json({ message: "Submission not found" });
    (req as any).submission = submission;
    next();
  } catch (error) {
    console.error("Load Submission Error:", error);
    res.status(500).json({ message: "Failed to load submission" });
  }
};

export const authorizeSubmissionOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const role = (req as any).role;
  const submission = (req as any).submission;
  if (!submission)
    return res.status(500).json({ message: "Submission not loaded" });
  // Allow admins
  if (role === Role.ADMIN) return next();

  // Allow submission owner (student)
  if (submission.sid === userId) return next();

  // Allow instructor who created the assignment or instructor managing the community
  if (role === Role.INSTRUCTOR) {
    try {
      // If the assignment's assigner_uid matches requester, allow
      if (submission.Assignment && submission.Assignment.assigner_uid === userId) {
        return next();
      }

      // Or if the instructor manages the assignment's community, allow
      const manages = await prisma.manages.findUnique({
        where: { iid_cid: { iid: userId, cid: submission.Assignment.cid } },
      });
      if (manages) return next();
    } catch (err) {
      console.error("authorizeSubmissionOwner error:", err);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  }

  return res
    .status(403)
    .json({ message: "Only owner, assigner instructor, community manager, or admins can perform this action" });
};

export const authorizeSubmissionManage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const role = (req as any).role;
  const submission = (req as any).submission;
  if (!submission)
    return res.status(500).json({ message: "Submission not loaded" });

  if (role === Role.ADMIN) return next();

  // Instructor managing the assignment's community
  const manages = await prisma.manages.findUnique({
    where: {
      iid_cid: { iid: userId, cid: submission.Assignment.cid },
    },
  });
  if (!manages)
    return res
      .status(403)
      .json({
        message: "Only community managers or admins can perform this action",
      });
  next();
};
