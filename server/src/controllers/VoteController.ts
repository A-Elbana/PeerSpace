import { Request, Response } from "express";
import prisma from "../config/prisma";

/**
 * Extended Request with userId and role
 */
interface VoteRequest extends Request {
  userId?: number;
  role?: string;
  studentId?: number; // Set by middleware
}

/**
 * Vote on a post (upvote or downvote)
 * Middleware: authenticateToken, requireStudentRole
 * Body: { postId: number, voteType: boolean } // true = upvote, false = downvote
 */
export const votePost = async (req: VoteRequest, res: Response) => {
  const { postId, voteType } = req.body;
  const studentId = req.studentId!; // Guaranteed by middleware

  // Validate inputs
  if (postId === undefined || voteType === undefined) {
    return res
      .status(400)
      .json({ message: "postId and voteType are required" });
  }

  if (typeof voteType !== "boolean") {
    return res
      .status(400)
      .json({ message: "voteType must be a boolean (true=upvote, false=downvote)" });
  }

  try {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { Community: true },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user has access to the community
    // For PRIVATE communities, check enrollment
    if (post.Community.type === "PRIVATE") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          cid_sid: {
            cid: post.cid,
            sid: studentId,
          },
        },
      });

      if (!enrollment) {
        return res.status(403).json({
          message: "You must be enrolled in this community to vote",
        });
      }
    }

    // Check if vote already exists
    const existingVote = await prisma.voted.findUnique({
      where: {
        sid_pid: {
          sid: studentId,
          pid: postId,
        },
      },
    });

    if (existingVote) {
      // Update existing vote if different
      if (existingVote.voteType !== voteType) {
        const updatedVote = await prisma.voted.update({
          where: {
            sid_pid: {
              sid: studentId,
              pid: postId,
            },
          },
          data: { voteType },
        });
        return res.status(200).json({
          message: "Vote updated successfully",
          vote: updatedVote,
        });
      } else {
        // Same vote type - no change needed
        return res.status(200).json({
          message: "Vote already recorded",
          vote: existingVote,
        });
      }
    }

    // Create new vote
    const newVote = await prisma.voted.create({
      data: {
        sid: studentId,
        pid: postId,
        voteType,
      },
    });

    res.status(201).json({
      message: "Vote recorded successfully",
      vote: newVote,
    });
  } catch (error) {
    console.error("Vote Post Error:", error);
    res.status(500).json({ message: "Failed to record vote" });
  }
};

/**
 * Remove vote from a post
 * Middleware: authenticateToken, requireStudentRole
 * Params: postId
 */
export const removeVote = async (req: VoteRequest, res: Response) => {
  const postId = parseInt(req.params.postId || "");
  const studentId = req.studentId!;

  if (isNaN(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    // Check if vote exists
    const existingVote = await prisma.voted.findUnique({
      where: {
        sid_pid: {
          sid: studentId,
          pid: postId,
        },
      },
    });

    if (!existingVote) {
      return res.status(404).json({ message: "Vote not found" });
    }

    // Delete the vote
    await prisma.voted.delete({
      where: {
        sid_pid: {
          sid: studentId,
          pid: postId,
        },
      },
    });

    res.status(200).json({ message: "Vote removed successfully" });
  } catch (error) {
    console.error("Remove Vote Error:", error);
    res.status(500).json({ message: "Failed to remove vote" });
  }
};

/**
 * Get vote counts and current user's vote for a post
 * Middleware: optionalAuthenticateToken (allows guests to see counts)
 * Params: postId
 */
export const getVoteInfo = async (req: VoteRequest, res: Response) => {
  const postId = parseInt(req.params.postId || "");
  const userId = req.userId;

  if (isNaN(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Get vote counts
    const upvotes = await prisma.voted.count({
      where: {
        pid: postId,
        voteType: true,
      },
    });

    const downvotes = await prisma.voted.count({
      where: {
        pid: postId,
        voteType: false,
      },
    });

    // Get current user's vote if authenticated and is a student
    let userVote = null;
    if (userId) {
      // Check if user is a student
      const student = await prisma.student.findUnique({
        where: { uid: userId },
      });

      if (student) {
        const vote = await prisma.voted.findUnique({
          where: {
            sid_pid: {
              sid: student.uid,
              pid: postId,
            },
          },
        });
        userVote = vote ? vote.voteType : null;
      }
    }

    res.status(200).json({
      postId,
      upvotes,
      downvotes,
      score: upvotes - downvotes,
      userVote, // null if not voted, true if upvoted, false if downvoted
    });
  } catch (error) {
    console.error("Get Vote Info Error:", error);
    res.status(500).json({ message: "Failed to fetch vote information" });
  }
};
