import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

/**
 * Extended Request interface
 */
interface AuthRequest extends Request {
  userId?: number;
  role?: string;
  studentId?: number;
}

/**
 * Middleware to ensure the authenticated user has a Student role
 * Must be used after authenticateToken middleware
 */
export const requireStudentRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const role = req.role;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Check if user has STUDENT role
  if (role !== "STUDENT") {
    return res.status(403).json({
      message: "Only students can vote on posts",
    });
  }

  // Verify student record exists
  const student = await prisma.student.findUnique({
    where: { uid: userId },
  });

  if (!student) {
    return res.status(403).json({
      message: "Student record not found",
    });
  }

  // Attach studentId to request for use in controllers
  req.studentId = student.uid;
  next();
};

/**
 * Middleware to validate vote request body
 */
export const validateVoteRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { postId, voteType } = req.body;

  // Validate postId
  if (!postId || typeof postId !== "number") {
    return res.status(400).json({
      message: "postId is required and must be a number",
    });
  }

  // Validate voteType
  if (voteType === undefined || typeof voteType !== "boolean") {
    return res.status(400).json({
      message:
        "voteType is required and must be a boolean (true for upvote, false for downvote)",
    });
  }

  next();
};
