import { Request, Response } from "express";
import prisma from "../config/prisma";

/**
 * Create a new badge (Admin only)
 * Expects: name, icon_url
 */
export const createBadge = async (req: Request, res: Response) => {
  const { name, icon_url } = req.body;

  try {
    // Check if badge with same name already exists
    const existingBadge = await prisma.badge.findFirst({
      where: { name: name.trim() },
    });

    if (existingBadge) {
      return res
        .status(409)
        .json({ message: "Badge with this name already exists" });
    }

    const badge = await prisma.badge.create({
      data: {
        name: name.trim(),
        icon_url: icon_url.trim(),
      },
    });

    return res.status(201).json({
      message: "Badge created successfully",
      badge,
    });
  } catch (error) {
    console.error("Create Badge Error:", error);
    return res.status(500).json({ message: "Failed to create badge" });
  }
};

/**
 * Get all badges with pagination
 * Query params: page, limit
 */
export const getAllBadges = async (req: Request, res: Response) => {
  const pageParam = parseInt(req.query.page as string);
  const limitParam = parseInt(req.query.limit as string);
  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit =
    !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
  const skip = (page - 1) * limit;

  try {
    const [badges, total] = await Promise.all([
      prisma.badge.findMany({
        skip,
        take: limit,
        orderBy: { id: "asc" },
        include: {
          _count: {
            select: { StudentBadge: true },
          },
        },
      }),
      prisma.badge.count(),
    ]);

    return res.status(200).json({
      message: "Badges retrieved successfully",
      data: badges,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get All Badges Error:", error);
    return res.status(500).json({ message: "Failed to fetch badges" });
  }
};

/**
 * Get badges earned by the authenticated student
 * Query params: page, limit
 */
export const getMyBadges = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const role = (req as any).role;

  const pageParam = parseInt(req.query.page as string);
  const limitParam = parseInt(req.query.limit as string);
  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit =
    !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
  const skip = (page - 1) * limit;

  if (role !== "STUDENT") {
    return res
      .status(403)
      .json({ message: "Only students can view their badges" });
  }

  try {
    const [studentBadges, total] = await Promise.all([
      prisma.studentBadge.findMany({
        where: { sid: userId },
        skip,
        take: limit,
        orderBy: { bid: "asc" },
        include: {
          Badge: true,
        },
      }),
      prisma.studentBadge.count({ where: { sid: userId } }),
    ]);

    return res.status(200).json({
      message: "Badges retrieved successfully",
      data: studentBadges,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get My Badges Error:", error);
    return res.status(500).json({ message: "Failed to fetch badges" });
  }
};

/**
 * Get badges earned by a specific user (by ID)
 * Params: userId
 * Query params: page, limit
 * Note: This endpoint does not rely on the authenticated user's token ID.
 */
export const getBadgesByUserId = async (req: Request, res: Response) => {
  const userIdParam = parseInt(req.params.userId || "");

  if (isNaN(userIdParam) || userIdParam <= 0) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const pageParam = parseInt(req.query.page as string);
  const limitParam = parseInt(req.query.limit as string);
  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit =
    !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
  const skip = (page - 1) * limit;

  try {
    // Ensure the user exists and is a student (badges are for students)
    const student = await prisma.student.findUnique({
      where: { uid: userIdParam },
    });
    if (!student) {
      return res
        .status(404)
        .json({ message: "Student profile not found for the given user ID" });
    }

    const [studentBadges, total] = await Promise.all([
      prisma.studentBadge.findMany({
        where: { sid: userIdParam },
        skip,
        take: limit,
        orderBy: { bid: "asc" },
        include: {
          Badge: true,
        },
      }),
      prisma.studentBadge.count({ where: { sid: userIdParam } }),
    ]);

    return res.status(200).json({
      message: "Badges retrieved successfully",
      data: studentBadges,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Badges By User ID Error:", error);
    return res.status(500).json({ message: "Failed to fetch badges" });
  }
};

/**
 * Get a single badge by ID
 * Params: id
 */
export const getBadgeById = async (req: Request, res: Response) => {
  const badgeId = parseInt(req.params.id || "");

  if (isNaN(badgeId)) {
    return res.status(400).json({ message: "Invalid badge ID" });
  }

  try {
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        _count: {
          select: { StudentBadge: true },
        },
      },
    });

    if (!badge) {
      return res.status(404).json({ message: "Badge not found" });
    }

    return res.status(200).json({
      message: "Badge retrieved successfully",
      badge,
    });
  } catch (error) {
    console.error("Get Badge By ID Error:", error);
    return res.status(500).json({ message: "Failed to fetch badge" });
  }
};

/**
 * Update a badge (Admin only)
 * Params: id
 * Body: name (optional), icon_url (optional)
 */
export const updateBadge = async (req: Request, res: Response) => {
  const badgeId = parseInt(req.params.id || "");
  const { name, icon_url } = req.body;

  if (isNaN(badgeId)) {
    return res.status(400).json({ message: "Invalid badge ID" });
  }

  const updateData: { name?: string; icon_url?: string } = {};

  if (name !== undefined) {
    updateData.name = name.trim();
  }

  if (icon_url !== undefined) {
    updateData.icon_url = icon_url.trim();
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  try {
    // Check if badge exists
    const existingBadge = await prisma.badge.findUnique({
      where: { id: badgeId },
    });

    if (!existingBadge) {
      return res.status(404).json({ message: "Badge not found" });
    }

    // If updating name, check for duplicates
    if (name !== undefined) {
      const duplicateBadge = await prisma.badge.findFirst({
        where: {
          name: name.trim(),
          id: { not: badgeId },
        },
      });

      if (duplicateBadge) {
        return res
          .status(409)
          .json({ message: "Badge with this name already exists" });
      }
    }

    const updatedBadge = await prisma.badge.update({
      where: { id: badgeId },
      data: updateData,
    });

    return res.status(200).json({
      message: "Badge updated successfully",
      badge: updatedBadge,
    });
  } catch (error) {
    console.error("Update Badge Error:", error);
    return res.status(500).json({ message: "Failed to update badge" });
  }
};

/**
 * Delete a badge (Admin only)
 * Params: id
 * Note: Cascade will delete all StudentBadge associations
 */
export const deleteBadge = async (req: Request, res: Response) => {
  const badgeId = parseInt(req.params.id || "");

  if (isNaN(badgeId)) {
    return res.status(400).json({ message: "Invalid badge ID" });
  }

  try {
    // Check if badge exists
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        _count: {
          select: { StudentBadge: true },
        },
      },
    });

    if (!badge) {
      return res.status(404).json({ message: "Badge not found" });
    }

    await prisma.badge.delete({
      where: { id: badgeId },
    });

    return res.status(200).json({
      message: "Badge deleted successfully",
      deletedCount: badge._count.StudentBadge,
    });
  } catch (error) {
    console.error("Delete Badge Error:", error);
    return res.status(500).json({ message: "Failed to delete badge" });
  }
};
