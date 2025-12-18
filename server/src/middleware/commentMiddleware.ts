import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";

export const loadComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        Post: { include: { Community: true, User: true } },
        User: true,
      },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    (req as any).comment = comment;
    next();
  } catch (error) {
    console.error("Load Comment Error:", error);
    res.status(500).json({ message: "Failed to load comment" });
  }
};

// Authorize comment owner
export const authorizeCommentOwner = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const comment = (req as any).comment;

  if (!comment) {
    return res.status(500).json({ message: "Comment not loaded" });
  }

  if (comment.commenter_uid !== userId) {
    return res
      .status(403)
      .json({ message: "Only owner can perform this action" });
  }

  next();
};

// Authorize post owner (for approving by original poster)
export const authorizePostOwner = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const comment = (req as any).comment;

  if (!comment) {
    return res.status(500).json({ message: "Comment not loaded" });
  }

  if (comment.Post.owner_uid !== userId) {
    return res.status(403).json({
      message: "Only original post owner can perform this action",
    });
  }

  next();
};

// Authorize instructor/admin for approving by instructor
export const authorizeInstructorApproval = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const role = (req as any).role;
  const comment = (req as any).comment;

  if (!comment) {
    return res.status(500).json({ message: "Comment not loaded" });
  }

  if (role === Role.ADMIN) {
    return next();
  }

  if (role !== Role.INSTRUCTOR) {
    return res.status(403).json({
      message: "Only instructors or admins can approve comments",
    });
  }

  // Check if instructor manages the community
  const manages = await prisma.manages.findUnique({
    where: {
      iid_cid: {
        iid: userId,
        cid: comment.Post.Community.id,
      },
    },
  });

  if (!manages) {
    return res.status(403).json({
      message: "Only instructors managing this community can approve",
    });
  }

  next();
};
