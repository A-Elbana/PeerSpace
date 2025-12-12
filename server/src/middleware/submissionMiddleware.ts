import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { Role } from "../generated/prisma/client";

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

export const authorizeSubmissionOwner = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const submission = (req as any).submission;
  if (!submission)
    return res.status(500).json({ message: "Submission not loaded" });
  if (submission.sid !== userId)
    return res
      .status(403)
      .json({ message: "Only owner can perform this action" });
  next();
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
