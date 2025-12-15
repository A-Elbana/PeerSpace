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
  const { title, type, body, cid, file_ids } = req.body;
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

    // Create file attachments if file_ids provided
    if (file_ids && Array.isArray(file_ids) && file_ids.length > 0) {
      await prisma.postFileAttachment.createMany({
        data: file_ids.map((fid: string) => ({
          pid: post.id,
          fid: String(fid),
        })),
        skipDuplicates: true,
      });
    }

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
        PostFileAttachment: {
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
  const { title, body, is_resolved, type, file_ids } = req.body;

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

    // Update file attachments if file_ids provided
    if (file_ids !== undefined && Array.isArray(file_ids)) {
      // Delete existing attachments
      await prisma.postFileAttachment.deleteMany({
        where: { pid: req.post.id },
      });

      // Create new attachments
      if (file_ids.length > 0) {
        await prisma.postFileAttachment.createMany({
          data: file_ids.map((fid: string) => ({
            pid: req.post.id,
            fid: String(fid),
          })),
          skipDuplicates: true,
        });
      }
    }

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

/**
 * Get all posts with search and filters (Admin only)
 * This endpoint is for admin dashboard to search across all posts
 */
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).role;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const tagSearch = req.query.tags as string | undefined;
    const communityId = req.query.communityId as string | undefined;

    console.log("[getAllPosts] Request params:", {
      userId,
      userRole,
      page,
      limit,
      search,
      tagSearch,
      communityId,
    });

    // Build where clause
    const whereClause: any = {};

    // Search by ID or title
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchId = parseInt(searchTerm);

      if (!isNaN(searchId)) {
        // Search by post ID
        whereClause.id = searchId;
      } else {
        // Search by title
        whereClause.title = { contains: searchTerm, mode: "insensitive" };
      }
    }

    // Filter by tag
    if (tagSearch && tagSearch.trim()) {
      whereClause.PostTag = {
        some: {
          tag: {
            contains: tagSearch.trim(),
            mode: "insensitive",
          },
        },
      };
    }

    // For non-admin users, only show posts from communities they have access to
    if (userRole !== "ADMIN") {
      // Get user's accessible community IDs
      const enrollments = await prisma.enrollment.findMany({
        where: { sid: userId },
        select: { cid: true },
      });

      const manages = await prisma.manages.findMany({
        where: { iid: userId },
        select: { cid: true },
      });

      const publicCommunities = await prisma.community.findMany({
        where: { type: CommunityType.PUBLIC },
        select: { id: true },
      });

      const accessibleCommunityIds = [
        ...enrollments.map((e) => e.cid),
        ...manages.map((m) => m.cid),
        ...publicCommunities.map((c) => c.id),
      ];

      // If communityId filter is provided, intersect with accessible communities
      if (communityId && communityId.trim()) {
        const requestedCommunityId = communityId.trim();
        if (accessibleCommunityIds.includes(requestedCommunityId)) {
          whereClause.cid = requestedCommunityId;
        } else {
          // User doesn't have access to requested community, return empty
          whereClause.cid = "IMPOSSIBLE_COMMUNITY_ID";
        }
      } else {
        // No specific community filter, show all accessible communities
        whereClause.cid = { in: accessibleCommunityIds };
      }
    } else {
      // Admin user - apply community filter if provided
      if (communityId && communityId.trim()) {
        whereClause.cid = communityId.trim();
      }
    }

    console.log(
      "[getAllPosts] Where clause:",
      JSON.stringify(whereClause, null, 2)
    );

    const posts = await prisma.post.findMany({
      where: whereClause,
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
        Community: {
          select: {
            id: true,
            name: true,
          },
        },
        PostTag: {
          select: {
            tag: true,
          },
        },
        _count: {
          select: { Comment: true },
        },
      },
    });

    // Format posts with tags
    const formattedPosts = posts.map((post) => {
      const tags = post.PostTag.map((pt) => pt.tag);
      const { PostTag, ...postData } = post;
      return { ...postData, tags };
    });

    const total = await prisma.post.count({ where: whereClause });

    res.status(200).json({
      data: formattedPosts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get All Posts Error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      userId: (req as any).userId,
      userRole: (req as any).role,
      search: req.query.search,
      tags: req.query.tags,
    });
    res.status(500).json({
      message: "Failed to fetch posts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
