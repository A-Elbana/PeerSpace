import { Request, Response } from "express";
import prisma from "../config/prisma";
import { Role } from "../generated/prisma/client";
import ActivityLogService, {
  ActivityActionType,
} from "../services/ActivityLogService";

// Create a comment
export const createComment = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const role = (req as any).role;
  const { pid, content, parentCommentId } = req.body as {
    pid: number | string;
    content: string;
    parentCommentId?: number;
  };

  const pidNum = Number(pid);
  if (!pid || Number.isNaN(pidNum)) {
    return res
      .status(400)
      .json({ message: "Post id (pid) is required and must be a number" });
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res.status(400).json({ message: "Content is required" });
  }

  try {
    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id: pidNum } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Permission: admin always allowed; instructor must manage community; student must be enrolled
    if (role !== Role.ADMIN) {
      if (role === Role.INSTRUCTOR) {
        const manages = await prisma.manages.findUnique({
          where: { iid_cid: { iid: userId, cid: post.cid } },
        });
        if (!manages) {
          return res.status(403).json({
            message: "Instructor must manage this community to comment",
          });
        }
      } else {
        const enrolled = await prisma.enrollment.findUnique({
          where: { cid_sid: { cid: post.cid, sid: userId } },
        });
        if (!enrolled) {
          return res.status(403).json({
            message: "Enrollment required to comment in this community",
          });
        }
      }
    }

    // If parent comment provided, verify it exists and belongs to same post
    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentCommentId },
      });
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      if (parentComment.pid !== pidNum) {
        return res
          .status(400)
          .json({ message: "Parent comment does not belong to this post" });
      }
    }

    const now = new Date();
    const comment = await prisma.comment.create({
      data: {
        pid: pidNum,
        content: content.trim(),
        commenter_uid: userId,
        comment_date: now,
        approved_by_inst: false,
        approved_by_op: false,
        parent_comment_id: parentCommentId || null,
      },
      include: {
        User: {
          select: { id: true, fname: true, lname: true, avatar_file_id: true },
        },
        other_Comment: true,
      },
    });

    // Log the activity with associated community
    await ActivityLogService.logActivity({
      userId,
      communityId: post.cid,
      actionType: ActivityActionType.COMMENT_CREATED,
      description: `Created comment on post #${pidNum}`,
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    console.error("Create Comment Error:", error);
    res.status(500).json({ message: "Failed to create comment" });
  }
};

// Get comments for a post with filtering
export const getCommentsByPost = async (req: Request, res: Response) => {
  const { pid } = req.query as any;
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(
    100,
    Math.max(1, parseInt((req.query.limit as string) || "10"))
  );
  const skip = (page - 1) * limit;
  // default true
  const sortBy = (req.query.sortBy as string) || "date"; // "date" or "approved"

  const pidNum = Number(pid);
  if (!pid || Number.isNaN(pidNum)) {
    return res.status(400).json({ message: "Post id (pid) is required" });
  }

  try {
    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id: pidNum } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Build where clause - only get top-level comments
    const where: any = { pid: pidNum };

    where.parent_comment_id = null;

    // Determine orderBy based on sortBy
    let orderBy: any = { comment_date: "asc" };
    if (sortBy === "approved") {
      // Sort by instructor approval first, then original poster approval, then date
      orderBy = [
        { approved_by_inst: "desc" },
        { approved_by_op: "desc" },
        { comment_date: "asc" },
      ];
    }

    const comments = await prisma.comment.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        User: {
          select: { id: true, fname: true, lname: true, avatar_file_id: true },
        },
        _count: {
          select: { other_Comment: true },
        },
      },
    });

    const total = await prisma.comment.count({ where });

    const data = comments.map((comment: any) => {
      const { _count, ...rest } = comment;
      return {
        ...rest,
        hasReplies: (_count?.other_Comment || 0) > 0,
      };
    });

    res.status(200).json({
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get Comments Error:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};

// Get a single comment by id
export const getCommentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const commentId = Number(id);

  if (Number.isNaN(commentId)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        User: {
          select: { id: true, fname: true, lname: true, avatar_file_id: true },
        },
        Post: { select: { id: true, owner_uid: true } },
        other_Comment: {
          orderBy: { comment_date: "asc" },
          include: {
            User: {
              select: {
                id: true,
                fname: true,
                lname: true,
                avatar_file_id: true,
              },
            },
          },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    console.error("Get Comment Error:", error);
    res.status(500).json({ message: "Failed to fetch comment" });
  }
};

// Update comment (owner only)
export const updateComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body as { content: string };

  const commentId = Number(id);
  if (Number.isNaN(commentId)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res.status(400).json({ message: "Content is required" });
  }

  try {
    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        User: {
          select: { id: true, fname: true, lname: true, avatar_file_id: true },
        },
        other_Comment: {
          include: {
            User: {
              select: {
                id: true,
                fname: true,
                lname: true,
                avatar_file_id: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    console.error("Update Comment Error:", error);
    res.status(500).json({ message: "Failed to update comment" });
  }
};

// Delete comment (owner or admin)
export const deleteComment = async (req: Request, res: Response) => {
  const { id } = req.params;

  const commentId = Number(id);
  if (Number.isNaN(commentId)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    // Fetch comment to get post/community info
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { Post: { select: { cid: true } } },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if this comment has any replies
    const repliesCount = await prisma.comment.count({
      where: { parent_comment_id: commentId },
    });

    // Log the activity BEFORE deleting the comment
    await ActivityLogService.logCommentDeleted(
      (req as any).userId,
      comment.Post.cid,
      `Deleted comment #${commentId}`
    );

    if (repliesCount === 0) {
      // No replies: hard delete
      await prisma.comment.delete({ where: { id: commentId } });

      return res.status(200).json({ success: true, deleted: "hard" });
    }

    // Has replies: soft delete (mark deleted and replace content)
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        content: "This comment was deleted",
      },
    });

    return res.status(200).json({ success: true, deleted: "soft" });
  } catch (error) {
    console.error("Delete Comment Error:", error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
};

// Approve comment by instructor
export const approveByInstructor = async (req: Request, res: Response) => {
  const { id } = req.params;

  const commentId = Number(id);
  if (Number.isNaN(commentId)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const now = new Date();
    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { approved_by_inst: true, approved_at_inst: now },
      include: {
        User: {
          select: { id: true, fname: true, lname: true, avatar_file_id: true },
        },
        Post: { select: { cid: true } },
      },
    });

    // Log the activity
    await ActivityLogService.logActivity({
      userId: (req as any).userId,
      communityId: comment.Post.cid,
      actionType: ActivityActionType.COMMENT_APPROVED,
      description: `Approved comment #${commentId} by instructor`,
    });

    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    console.error("Approve by Instructor Error:", error);
    res.status(500).json({ message: "Failed to approve comment" });
  }
};

// Approve comment by original post owner
export const approveByOriginalPoster = async (req: Request, res: Response) => {
  const { id } = req.params;

  const commentId = Number(id);
  if (Number.isNaN(commentId)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const now = new Date();
    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { approved_by_op: true, approved_at_op: now },
      include: {
        User: {
          select: { id: true, fname: true, lname: true, avatar_file_id: true },
        },
        Post: { select: { cid: true } },
      },
    });

    // Log the activity
    await ActivityLogService.logActivity({
      userId: (req as any).userId,
      communityId: comment.Post.cid,
      actionType: ActivityActionType.COMMENT_APPROVED,
      description: `Approved comment #${commentId} by original poster`,
    });

    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    console.error("Approve by OP Error:", error);
    res.status(500).json({ message: "Failed to approve comment" });
  }
};

// Get pending comments for moderation (comments awaiting instructor approval)
export const getUnapprovedComments = async (req: Request, res: Response) => {
  const { pid } = req.query as any;
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(
    100,
    Math.max(1, parseInt((req.query.limit as string) || "10"))
  );
  const skip = (page - 1) * limit;

  const pidNum = Number(pid);
  if (!pid || Number.isNaN(pidNum)) {
    return res.status(400).json({ message: "Post id (pid) is required" });
  }

  try {
    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id: pidNum } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Get comments NOT approved by instructor yet
    const where = {
      pid: pidNum,
      approved_by_inst: false,
    };

    const comments = await prisma.comment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { comment_date: "asc" },
      include: {
        User: {
          select: { id: true, fname: true, lname: true, avatar_file_id: true },
        },
        other_Comment: {
          include: {
            User: {
              select: {
                id: true,
                fname: true,
                lname: true,
                avatar_file_id: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.comment.count({ where });

    res.status(200).json({
      success: true,
      data: comments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get Unapproved Comments Error:", error);
    res.status(500).json({ message: "Failed to fetch unapproved comments" });
  }
};

// Get comment count for a post
export const getCommentCount = async (req: Request, res: Response) => {
  const { pid } = req.query as any;

  const pidNum = Number(pid);
  if (!pid || Number.isNaN(pidNum)) {
    return res.status(400).json({ message: "Post id (pid) is required" });
  }

  try {
    const total = await prisma.comment.count({ where: { pid: pidNum } });
    const approved = await prisma.comment.count({
      where: {
        pid: pidNum,
        approved_by_inst: true,
        approved_by_op: true,
      },
    });
    const pending = total - approved;

    res.status(200).json({
      success: true,
      data: { total, approved, pending },
    });
  } catch (error) {
    console.error("Get Comment Count Error:", error);
    res.status(500).json({ message: "Failed to fetch comment count" });
  }
};

/**
 * Get all first-level replies of a comment
 * Expects: id (path param)
 * Behavior: returns direct child comments of the given comment
 */
export const getAllRepliesOfComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(
    100,
    Math.max(1, parseInt((req.query.limit as string) || "10"))
  );
  const skip = (page - 1) * limit;
  const sortBy = (req.query.sortBy as string) || "date"; // "date" or "approved"

  const commentId = Number(id);
  if (Number.isNaN(commentId)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    // Check if the parent comment exists
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!parentComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Get first-level child comments only
    const where: any = { parent_comment_id: commentId };

    // Determine orderBy based on sortBy
    let orderBy: any = { comment_date: "asc" };
    if (sortBy === "approved") {
      // Sort by instructor approval first, then original poster approval, then date
      orderBy = [
        { approved_by_inst: "desc" },
        { approved_by_op: "desc" },
        { comment_date: "asc" },
      ];
    }

    const comments = await prisma.comment.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        User: {
          select: { id: true, fname: true, lname: true, avatar_file_id: true },
        },
        _count: {
          select: { other_Comment: true },
        },
      },
    });

    const total = await prisma.comment.count({ where });

    // Map comments to include hasReplies flag
    const data = comments.map((comment: any) => {
      const { _count, ...rest } = comment;
      return {
        ...rest,
        hasReplies: (_count?.other_Comment || 0) > 0,
      };
    });

    res.status(200).json({
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get Replies Error:", error);
    res.status(500).json({ message: "Failed to fetch replies" });
  }
};
