import { Request, Response } from "express";
import prisma from "../config/prisma";
import { Role, CommunityType } from "../generated/prisma/client";

// Community selection for safe public responses
const communitySelect = {
  id: true,
  name: true,
  description: true,
  type: true,
  banner_url: true,
};

// Helper to sanitize strings
const sanitizeString = (input: string): string => {
  return input.trim().substring(0, 255);
};

// Simple UUID v4 validator
const isValidUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

// Helper to check if user manages a community (Instructor)
const isUserManagerOfCommunity = async (
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

// Helper to check if user is member (Student enrolled or Instructor managing)
const isUserMemberOfCommunity = async (
  userId: number,
  communityId: string
): Promise<boolean> => {
  // Check enrollment (Student)
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      cid_sid: {
        cid: communityId,
        sid: userId,
      },
    },
  });
  if (enrollment) return true;

  // Check manages (Instructor)
  return isUserManagerOfCommunity(userId, communityId);
};

/**
 * Create a new community
 * Only INSTRUCTOR and ADMIN can create communities
 */
export const createCommunity = async (req: Request, res: Response) => {
  const { name, description, type, banner_url } = req.body;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  try {
    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required" });
    }

    // Validate type (PUBLIC or PRIVATE)
    const validTypes = Object.values(CommunityType);
    if (!validTypes.includes(type.toUpperCase() as CommunityType)) {
      return res
        .status(400)
        .json({ message: "Type must be PUBLIC or PRIVATE" });
    }

    // Only INSTRUCTOR or ADMIN can create communities
    if (userRole !== Role.INSTRUCTOR && userRole !== Role.ADMIN) {
      return res
        .status(403)
        .json({
          message: "Only instructors and admins can create communities",
        });
    }

    // Create community (id is auto-generated)
    const community = await prisma.community.create({
      data: {
        name: sanitizeString(name),
        description: description ? sanitizeString(description) : null,
        type: type.toUpperCase() as CommunityType,
        banner_url: banner_url || null,
      } as any,
      select: communitySelect,
    });

    // If creator is INSTRUCTOR, add them as manager
    if (userRole === Role.INSTRUCTOR) {
      await prisma.manages.create({
        data: {
          iid: userId,
          cid: community.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: "Community created successfully",
      data: community,
    });
  } catch (error: any) {
    console.error("Create Community Error:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Community name already exists" });
    }
    res.status(500).json({ message: "Failed to create community" });
  }
};

/**
 * Get all communities with pagination
 * PUBLIC communities visible to everyone (including guests)
 * PRIVATE communities visible to members or admins
 * Authenticated users see: all PUBLIC + their PRIVATE communities
 */
export const getCommunities = async (req: Request, res: Response) => {
  const userId = (req as any).userId; // May be undefined for guests
  const userRole = (req as any).role;

  // Pagination with validation
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit as string) || 10)
  );
  const skip = (page - 1) * limit;

  // Filter by type (optional)
  const typeFilter = (req.query.type as string | undefined)?.toUpperCase();

  try {
    let whereClause: any = {};

    // Guests see only public communities
    if (!userId) {
      whereClause.type = CommunityType.PUBLIC;
    } else if (
      typeFilter &&
      Object.values(CommunityType).includes(typeFilter as CommunityType)
    ) {
      const typeEnum = typeFilter as CommunityType;
      if (typeEnum === CommunityType.PUBLIC) {
        whereClause.type = CommunityType.PUBLIC;
      } else {
        // Private filter: only the user's private communities
        whereClause = {
          type: CommunityType.PRIVATE,
          OR: [
            { Enrollment: { some: { sid: userId } } },
            { Manages: { some: { iid: userId } } },
          ],
        };
      }
    } else if (userRole === Role.ADMIN) {
      // Admins see everything
      whereClause = {};
    } else {
      // Authenticated users: public + their private communities
      whereClause = {
        OR: [
          { type: CommunityType.PUBLIC },
          {
            type: CommunityType.PRIVATE,
            AND: {
              OR: [
                { Enrollment: { some: { sid: userId } } },
                { Manages: { some: { iid: userId } } },
              ],
            },
          },
        ],
      };
    }

    const communities = await prisma.community.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      select: communitySelect,
    });

    const total = await prisma.community.count({ where: whereClause });

    res.status(200).json({
      success: true,
      data: communities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get Communities Error:", error);
    res.status(500).json({ message: "Failed to fetch communities" });
  }
};

/**
 * Get community by ID
 * PUBLIC: anyone can view
 * PRIVATE: only members can view
 */
export const getCommunityById = async (req: Request, res: Response) => {
  const id = req.params.id || "";
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!isValidUUID(id)) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  try {
    const community = await prisma.community.findUnique({
      where: { id },
      select: {
        ...communitySelect,
        _count: {
          select: {
            Enrollment: true,
            Post: true,
          },
        },
      },
    });

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // PUBLIC: accessible to everyone
    if (community.type === "PUBLIC") {
      return res.status(200).json({
        success: true,
        data: community,
      });
    }

    // PRIVATE: require authentication and membership (or admin)
    if (!userId) {
      return res
        .status(403)
        .json({
          message: "Authentication required to view private communities",
        });
    }

    if (userRole === Role.ADMIN) {
      return res.status(200).json({
        success: true,
        data: community,
      });
    }

    // Check membership
    const isMember = await isUserMemberOfCommunity(userId, id);
    if (!isMember) {
      return res
        .status(403)
        .json({
          message: "You must be a member to view this private community",
        });
    }

    res.status(200).json({
      success: true,
      data: community,
    });
  } catch (error: any) {
    console.error("Get Community Error:", error);
    res.status(500).json({ message: "Failed to fetch community" });
  }
};

/**
 * Update community
 * Only managers (Instructor managing this community) or ADMIN
 */
export const updateCommunity = async (req: Request, res: Response) => {
  const id = req.params.id || "";
  const userId = (req as any).userId;
  const userRole = (req as any).role;
  const { name, description, banner_url, type } = req.body;

  if (!isValidUUID(id)) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  try {
    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Authorization: Manager or Admin
    const isManager = await isUserManagerOfCommunity(userId, id);
    if (!isManager && userRole !== Role.ADMIN) {
      return res
        .status(403)
        .json({
          message:
            "Only community managers or admins can update this community",
        });
    }

    // Build update data
    const updateData: any = {};
    if (name) updateData.name = sanitizeString(name);
    if (description !== undefined)
      updateData.description = description ? sanitizeString(description) : null;
    if (banner_url !== undefined) updateData.banner_url = banner_url || null;
    if (type && ["PUBLIC", "PRIVATE"].includes(type.toUpperCase())) {
      updateData.type = type.toUpperCase();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updatedCommunity = await prisma.community.update({
      where: { id },
      data: updateData,
      select: communitySelect,
    });

    res.status(200).json({
      success: true,
      message: "Community updated successfully",
      data: updatedCommunity,
    });
  } catch (error: any) {
    console.error("Update Community Error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Community not found" });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Community name already exists" });
    }
    res.status(500).json({ message: "Failed to update community" });
  }
};

/**
 * Delete community
 * ADMIN or community MANAGER can delete
 */
export const deleteCommunity = async (req: Request, res: Response) => {
  const id = req.params.id || "";
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!isValidUUID(id)) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  // Check if user is ADMIN or manager of this community
  if (userRole !== Role.ADMIN) {
    const isManager = await isUserManagerOfCommunity(userId, id);
    if (!isManager) {
      return res
        .status(403)
        .json({
          message: "Only admins or community managers can delete communities",
        });
    }
  }

  try {
    await prisma.community.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Community deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete Community Error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Community not found" });
    }
    if (error.code === "P2003") {
      return res
        .status(409)
        .json({ message: "Cannot delete community with existing relations" });
    }
    res.status(500).json({ message: "Failed to delete community" });
  }
};

/**
 * Get members of a community
 * Only managers, admins, or members can view
 */
export const getCommunityMembers = async (req: Request, res: Response) => {
  const id = req.params.id || "";
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  // Pagination
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit as string) || 10)
  );
  const skip = (page - 1) * limit;

  if (!isValidUUID(id)) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  try {
    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Authorization: Members/Managers/Admins can view member list
    const isMember = await isUserMemberOfCommunity(userId, id);
    if (!isMember && userRole !== Role.ADMIN) {
      return res
        .status(403)
        .json({ message: "Only members can view the member list" });
    }

    // Get enrolled students
    const students = await prisma.enrollment.findMany({
      where: { cid: id },
      skip,
      take: limit,
      select: {
        Student: {
          select: {
            User: {
              select: {
                id: true,
                fname: true,
                lname: true,
                avatar_url: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Get managing instructors
    const instructors = await prisma.manages.findMany({
      where: { cid: id },
      select: {
        Instructor: {
          select: {
            User: {
              select: {
                id: true,
                fname: true,
                lname: true,
                avatar_url: true,
                role: true,
              },
            },
          },
        },
      },
    });

    const studentList = students.map((s) => s.Student.User);
    const instructorList = instructors.map((i) => i.Instructor.User);

    const totalStudents = await prisma.enrollment.count({ where: { cid: id } });

    res.status(200).json({
      success: true,
      data: {
        students: studentList,
        instructors: instructorList,
      },
      meta: {
        totalStudents,
        page,
        limit,
        totalPages: Math.ceil(totalStudents / limit),
      },
    });
  } catch (error: any) {
    console.error("Get Community Members Error:", error);
    res.status(500).json({ message: "Failed to fetch community members" });
  }
};

/**
 * Share community invitation code (community ID)
 * PUBLIC: anyone can get it
 * PRIVATE: only members or admins can get it
 */
export const shareCommunity = async (req: Request, res: Response) => {
  const id = req.params.id || "";
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!isValidUUID(id)) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  const community = await prisma.community.findUnique({
    where: { id },
    select: { id: true, type: true },
  });

  if (!community) {
    return res.status(404).json({ message: "Community not found" });
  }

  if (community.type === CommunityType.PRIVATE && userRole !== Role.ADMIN) {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Authentication required to view invitation code" });
    }
    const isMember = await isUserMemberOfCommunity(userId, id);
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "Only members or admins can view invitation code" });
    }
  }

  return res.status(200).json({
    success: true,
    data: { communityId: community.id },
  });
};
