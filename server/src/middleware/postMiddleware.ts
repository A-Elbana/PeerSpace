import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { Role, CommunityType } from "../generated/prisma/client";
import { isValidUUID, isUserMemberOfCommunity, isUserManagerOfCommunity } from "../utils/helpers";

/**
 * Extended Request with post data
 */
interface PostRequest extends Request {
  post?: any;
  community?: any;
}

/**
 * Middleware: Load post by ID from params and attach to request
 * Also loads the associated community
 * Fails with 404 if post doesn't exist
 */
export const loadPost = async (
  req: PostRequest,
  res: Response,
  next: NextFunction
) => {
  const postId = parseInt(req.params.id || req.params.postId || "");

  if (isNaN(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        Community: true,
        User: {
          select: {
            id: true,
            fname: true,
            lname: true,
            avatar_file_id: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    req.post = post;
    req.community = post.Community;
    next();
  } catch (error) {
    console.error("Load Post Error:", error);
    res.status(500).json({ message: "Failed to load post" });
  }
};

/**
 * Middleware: Authorize post access based on community type
 * PUBLIC communities: accessible to everyone (including guests)
 * PRIVATE communities: accessible only to members or admins
 */
export const authorizePostAccess = async (
  req: PostRequest,
  res: Response,
  next: NextFunction
) => {
  const community = req.community;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!community) {
    return res.status(500).json({ message: "Community not loaded" });
  }

  // PUBLIC communities are accessible to everyone
  if (community.type === CommunityType.PUBLIC) {
    return next();
  }

  // PRIVATE communities require authentication
  if (!userId) {
    return res
      .status(403)
      .json({ message: "Authentication required for private communities" });
  }

  // Admins have access to all communities
  if (userRole === Role.ADMIN) {
    return next();
  }

  // Check membership
  const isMember = await isUserMemberOfCommunity(userId, community.id);
  if (!isMember) {
    return res
      .status(403)
      .json({ message: "You must be a member to access this private community" });
  }

  next();
};

/**
 * Middleware: Authorize post edit/delete
 * Only post owner, community instructors, or admins can edit/delete
 */
export const authorizePostEdit = async (
  req: PostRequest,
  res: Response,
  next: NextFunction
) => {
  const post = req.post;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!post) {
    return res.status(500).json({ message: "Post not loaded" });
  }

  // Admins can edit any post
  if (userRole === Role.ADMIN) {
    return next();
  }

  // Post owner can edit their own post
  if (post.owner_uid === userId) {
    return next();
  }

  // Community instructors can edit posts in their communities
  const isInstructor = await isUserManagerOfCommunity(userId, post.cid);
  if (isInstructor) {
    return next();
  }

  return res
    .status(403)
    .json({ message: "You are not authorized to edit this post" });
};

/**
 * Middleware: Require community membership to create posts
 * Used when creating posts - checks membership in the target community
 */
export const requirePostMembership = async (
  req: PostRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const userRole = (req as any).role;
  const cid = req.body.cid;

  if (!cid) {
    return res.status(400).json({ message: "Community ID (cid) is required" });
  }

  if (!isValidUUID(String(cid))) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  // Admins bypass membership requirement
  if (userRole === Role.ADMIN) {
    return next();
  }

  try {
    // Check community exists
    const community = await prisma.community.findUnique({
      where: { id: String(cid) },
    });

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Check membership
    const isMember = await isUserMemberOfCommunity(userId, String(cid));
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You must be a member of this community to create posts" });
    }

    req.community = community;
    next();
  } catch (error) {
    console.error("Require Post Membership Error:", error);
    res.status(500).json({ message: "Failed to verify membership" });
  }
};

