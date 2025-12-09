import { Request, Response } from "express";
import prisma from "../config/prisma";

const isValidUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

// Helper to check if user is in community
const isUserInCommunity = async (
  userId: number,
  communityId: string
): Promise<boolean> => {
  // Check Enrollment (Student)
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      cid_sid: {
        cid: communityId,
        sid: userId,
      },
    },
  });
  if (enrollment) return true;

  // Check Manages (Instructor)
  const manages = await prisma.manages.findUnique({
    where: {
      iid_cid: {
        iid: userId,
        cid: communityId,
      },
    },
  });
  if (manages) return true;

  return false;
};

// Helper to check if user is an instructor of the community
const isInstructorOfCommunity = async (
  userId: number,
  communityId: string
): Promise<boolean> => {
  const manages = await prisma.manages.findUnique({
    where: {
      iid_cid: {
        iid: userId,
        cid: communityId,
      },
    },
  });
  return !!manages;
};

// Helper to check community access (public vs private)
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
  if (community.type === "PUBLIC") {
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
  const isMember = await isUserInCommunity(userId, communityId);
  if (!isMember) {
    return {
      allowed: false,
      message: "You must be a member of this private community",
    };
  }

  return { allowed: true };
};

export const createPost = async (req: Request, res: Response) => {
  const { title, type, body, cid } = req.body;
  const userId = (req as any).userId;

  if (!cid) {
    return res.status(400).json({ message: "Community ID (cid) is required" });
  }

  const communityId = String(cid);
  if (!isValidUUID(communityId)) {
    return res.status(400).json({ message: "Invalid Community ID" });
  }

  // Validate membership (Student enrolled or Instructor managing)
  const isMember = await isUserInCommunity(userId, communityId);
  const role = (req as any).role;

  // Allow members (Students/Instructors of the community) and global Admins
  if (!isMember && role !== "ADMIN") {
    return res
      .status(403)
      .json({ message: "You are not a member of this community" });
  }

  try {
    const post = await prisma.post.create({
      data: {
        title,
        type,
        body,
        cid: communityId,
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

export const getPostById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id || "");
  const userId = (req as any).userId; // May be undefined for guests
  const role = (req as any).role;

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            fname: true,
            lname: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check community access (supports public posts for guests)
    const accessCheck = await canAccessCommunity(userId, post.cid, role);
    if (!accessCheck.allowed) {
      return res.status(403).json({ message: accessCheck.message });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Get Post Error:", error);
    res.status(500).json({ message: "Failed to get post" });
  }
};

export const getPostsByCommunity = async (req: Request, res: Response) => {
  const cid = req.query.cid as string;
  const userId = (req as any).userId; // May be undefined for guests
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
            avatar_url: true,
          },
        },
        _count: {
          select: { Comment: true },
        },
      },
    });

    const total = await prisma.post.count({ where: { cid } });

    res.status(200).json({
      data: posts,
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

export const updatePost = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id || "");
  const userId = (req as any).userId;
  const role = (req as any).role;
  const { title, body, is_resolved, type } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Validate membership
    const isMember = await isUserInCommunity(userId, post.cid);
    if (!isMember && role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "You are not a member of this community" });
    }

    // Validate ownership for update (or admin/instructor)
    // Usually, only the owner can edit the content. Instructors might edit status (resolved).
    // For simplicity, let's allow Owner, Admin, or Instructor of that community to update.
    if (post.owner_uid !== userId && role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Only the author or an admin can update this post" });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
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

export const deletePost = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id || "");
  const userId = (req as any).userId;
  const role = (req as any).role;

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Validation: Owner OR Admin OR Instructor of such community
    const isInstructor = await isInstructorOfCommunity(userId, post.cid);

    if (post.owner_uid !== userId && role !== "ADMIN" && !isInstructor) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this post" });
    }

    await prisma.post.delete({ where: { id } });
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete Post Error:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

export const togglePostResolved = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id || "");
  const userId = (req as any).userId;
  const role = (req as any).role;

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Validate membership
    const isMember = await isUserInCommunity(userId, post.cid);
    if (!isMember && role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "You are not a member of this community" });
    }

    // OP or Instructor of community or Admin
    const isInstructor = await isInstructorOfCommunity(userId, post.cid);

    if (post.owner_uid !== userId && !isInstructor && role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "You are not authorized to resolve this post" });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        is_resolved: !post.is_resolved,
      },
    });
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Toggle Resolved Error:", error);
    res.status(500).json({ message: "Failed to toggle post resolution" });
  }
};
