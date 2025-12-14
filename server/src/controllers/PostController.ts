import { Request, Response } from "express";
import prisma from "../config/prisma";
import { CommunityType } from "../generated/prisma/client";
import { isValidUUID, isUserMemberOfCommunity } from "../utils/helpers";

/**
 * Extended Request with post and community data (set by middleware)
 */
interface PostRequest extends Request {
  post?: any;
  community?: any;
}

/**
 * Helper to check community access (public vs private)
 * Used for getPostsByCommunity which doesn't use loadPost middleware
 */
const canAccessCommunity = async (
  userId: number | undefined,
  communityId: string,
  userRole: string | undefined
): Promise<{ allowed: boolean; message?: string }> => {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });

  if (!community) {
    return { allowed: false, message: "Community not found" };
  }

  // PUBLIC communities: everyone can access
  if (community.type === CommunityType.PUBLIC) {
    return { allowed: true };
  }

  // PRIVATE communities: require authentication
  if (!userId) {
    return {
      allowed: false,
      message: "Authentication required for private communities",
    };
  }

  // Admins have access to all
  if (userRole === "ADMIN") {
    return { allowed: true };
  }

  // Check membership
  const isMember = await isUserMemberOfCommunity(userId, communityId);
  if (!isMember) {
    return {
      allowed: false,
      message: "You must be a member of this private community",
    };
  }

  return { allowed: true };
};

/**
 * Create a new post
 * Middleware: authenticateToken, requirePostMembership
 * req.community is set by requirePostMembership
 */
export const createPost = async (req: PostRequest, res: Response) => {
  const { title, type, body, cid } = req.body;
  const userId = (req as any).userId;

  // Validation already done by middleware, community exists and user is member
  try {
    const post = await prisma.post.create({
      data: {
        title,
        type,
        body,
        cid: String(cid),
        owner_uid: userId,
        post_date: new Date(),
        is_resolved: false,
      },
    });
    res.status(201).json(post);
  } catch (error) {
    console.error("Create Post Error:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

/**
 * Get a post by ID
 * Middleware: optionalAuthenticateToken, loadPost, authorizePostAccess
 * req.post is set by loadPost
 */
export const getPostById = async (req: PostRequest, res: Response) => {
  const userId = (req as any).userId;
  const postId = req.post.id;

  try {
    // Get vote counts
    const upvotes = await prisma.voted.count({
      where: { pid: postId, voteType: true },
    });

    const downvotes = await prisma.voted.count({
      where: { pid: postId, voteType: false },
    });

    // Get current user's vote if authenticated and is a student
    let userVote = null;
    if (userId) {
      const student = await prisma.student.findUnique({
        where: { uid: userId },
      });

      if (student) {
        const vote = await prisma.voted.findUnique({
          where: { sid_pid: { sid: student.uid, pid: postId } },
        });
        userVote = vote ? vote.voteType : null;
      }
    }

    // Get attached files
    const files = await prisma.file.findMany({
      where: {
        context: "POST",
        context_id: postId,
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

    // Post already loaded and access authorized by middleware
    res.status(200).json({
      ...req.post,
      files,
      votes: {
        upvotes,
        downvotes,
        score: upvotes - downvotes,
        userVote,
      },
    });
  } catch (error) {
    console.error("Get Post By ID Error:", error);
    res.status(500).json({ message: "Failed to fetch post" });
  }
};

/**
 * Get posts by community with pagination
 * Middleware: optionalAuthenticateToken
 * Note: This doesn't use loadPost since it queries by community, not post ID
 */
export const getPostsByCommunity = async (req: Request, res: Response) => {
  const cid = req.query.cid as string;
  const userId = (req as any).userId;
  const role = (req as any).role;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  if (!cid || !isValidUUID(cid)) {
    return res.status(400).json({ message: "Community ID is required" });
  }

  try {
    // Check community access (supports public communities for guests)
    const accessCheck = await canAccessCommunity(userId, cid, role);
    if (!accessCheck.allowed) {
      return res.status(403).json({ message: accessCheck.message });
    }

    const posts = await prisma.post.findMany({
      where: { cid },
      skip,
      take: limit,
      orderBy: { post_date: "desc" },
      include: {
        User: {
          select: {
            id: true,
            fname: true,
            lname: true,
            avatar_file_id: true,
          },
        },
        _count: {
          select: { Comment: true },
        },
      },
    });

    // Get vote counts for all posts
    const postsWithVotes = await Promise.all(
      posts.map(async (post) => {
        const upvotes = await prisma.voted.count({
          where: { pid: post.id, voteType: true },
        });

        const downvotes = await prisma.voted.count({
          where: { pid: post.id, voteType: false },
        });

        // Get current user's vote if authenticated and is a student
        let userVote = null;
        if (userId) {
          const student = await prisma.student.findUnique({
            where: { uid: userId },
          });

          if (student) {
            const vote = await prisma.voted.findUnique({
              where: { sid_pid: { sid: student.uid, pid: post.id } },
            });
            userVote = vote ? vote.voteType : null;
          }
        }

        return {
          ...post,
          votes: {
            upvotes,
            downvotes,
            score: upvotes - downvotes,
            userVote,
          },
        };
      })
    );

    const total = await prisma.post.count({ where: { cid } });

    res.status(200).json({
      data: postsWithVotes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Posts Error:", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

/**
 * Update a post
 * Middleware: authenticateToken, loadPost, authorizePostEdit
 * req.post is set by loadPost, authorization done by authorizePostEdit
 */
export const updatePost = async (req: PostRequest, res: Response) => {
  const { title, body, is_resolved, type } = req.body;

  try {
    const updatedPost = await prisma.post.update({
      where: { id: req.post.id },
      data: {
        title,
        body,
        is_resolved,
        type,
      },
    });
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Update Post Error:", error);
    res.status(500).json({ message: "Failed to update post" });
  }
};

/**
 * Delete a post
 * Middleware: authenticateToken, loadPost, authorizePostEdit
 * req.post is set by loadPost, authorization done by authorizePostEdit
 */
export const deletePost = async (req: PostRequest, res: Response) => {
  try {
    // Delete associated files from Cloudinary and database
    const files = await prisma.file.findMany({
      where: {
        context: "POST",
        context_id: req.post.id,
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
        context: "POST",
        context_id: req.post.id,
      },
    });

    // Delete the post
    await prisma.post.delete({ where: { id: req.post.id } });
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete Post Error:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

/**
 * Toggle post resolved status
 * Middleware: authenticateToken, loadPost, authorizePostEdit
 * req.post is set by loadPost, authorization done by authorizePostEdit
 */
export const togglePostResolved = async (req: PostRequest, res: Response) => {
  try {
    const updatedPost = await prisma.post.update({
      where: { id: req.post.id },
      data: {
        is_resolved: !req.post.is_resolved,
      },
    });
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Toggle Resolved Error:", error);
    res.status(500).json({ message: "Failed to toggle post resolution" });
  }
};
