import { Request, Response } from "express";
import prisma from "../config/prisma";
import { Role, CommunityType } from "../generated/prisma/client";
import ActivityLogService from "../services/ActivityLogService";

// Community selection for safe public responses
const communitySelect = {
  id: true,
  name: true,
  description: true,
  type: true,
  banner_file_id: true,
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
 * Check if a given user manages a given community (by params)
 */
export const checkUserManagerStatus = async (req: Request, res: Response) => {
  const communityId = req.params.cid;
  const userIdParam = parseInt(req.params.uid || "", 10);

  if (!communityId || !isValidUUID(communityId)) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  if (isNaN(userIdParam) || userIdParam <= 0) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const isManager = await isUserManagerOfCommunity(userIdParam, communityId);
    return res.status(200).json({
      success: true,
      isManager,
      communityId,
      userId: userIdParam,
    });
  } catch (error) {
    console.error("Check User Manager Status Error:", error);
    return res.status(500).json({ message: "Failed to check manager status" });
  }
};

/**
 * Create a new community
 * Only INSTRUCTOR and ADMIN can create communities
 */
export const createCommunity = async (req: Request, res: Response) => {
  const { name, description, type, banner_file_id } = req.body;
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
      return res.status(403).json({
        message: "Only instructors and admins can create communities",
      });
    }

    // Create community (id is auto-generated)
    const community = await prisma.community.create({
      data: {
        name: sanitizeString(name),
        description: description ? sanitizeString(description) : null,
        type: type.toUpperCase() as CommunityType,
      },
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

    // Log the activity
    await ActivityLogService.logCommunityCreated(
      userId,
      community.id,
      `Created community "${community.name}"`
    );

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
  const pageParam = parseInt(req.query.page as string);
  const limitParam = parseInt(req.query.limit as string);

  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit =
    !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
  const skip = (page - 1) * limit;

  // Filter by type (optional)
  const typeFilter = (req.query.type as string | undefined)?.toUpperCase();

  // Search parameters
  const search = req.query.search as string | undefined;
  const tagSearch = req.query.tags as string | undefined;

  try {
    let whereClause: any = {};

    // Check if type filter is provided and valid
    const isValidTypeFilter =
      typeFilter &&
      Object.values(CommunityType).includes(typeFilter as CommunityType);

    // Admins see everything (highest priority)
    if (userRole === Role.ADMIN) {
      if (isValidTypeFilter) {
        whereClause.type = typeFilter as CommunityType;
      }
      // else: no filter, show all (whereClause stays empty = all communities)
    }
    // Guests (no authentication)
    else if (!userId) {
      whereClause.type = CommunityType.PUBLIC;
    }
    // Authenticated non-admin users: apply filtering
    else {
      // Type filter provided
      if (isValidTypeFilter) {
        const typeEnum = typeFilter as CommunityType;
        if (typeEnum === CommunityType.PUBLIC) {
          // Show public communities
          whereClause.type = CommunityType.PUBLIC;
        } else {
          // Show only their private communities
          whereClause = {
            AND: [
              { type: CommunityType.PRIVATE },
              {
                OR: [
                  { Enrollment: { some: { sid: userId } } },
                  { Manages: { some: { iid: userId } } },
                ],
              },
            ],
          };
        }
      } else {
        // No type filter: show public + their private communities
        whereClause = {
          OR: [
            { type: CommunityType.PUBLIC },
            {
              AND: [
                { type: CommunityType.PRIVATE },
                {
                  OR: [
                    { Enrollment: { some: { sid: userId } } },
                    { Manages: { some: { iid: userId } } },
                  ],
                },
              ],
            },
          ],
        };
      }
    }

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = search.trim();

      // Check if search is a UUID (community ID)
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          searchTerm
        );

      if (isUUID) {
        // Search by ID
        whereClause =
          whereClause.AND || whereClause.OR
            ? { AND: [whereClause, { id: searchTerm }] }
            : { ...whereClause, id: searchTerm };
      } else {
        // Search by name
        const nameSearch = {
          name: { contains: searchTerm, mode: "insensitive" as const },
        };
        whereClause =
          whereClause.AND || whereClause.OR
            ? { AND: [whereClause, nameSearch] }
            : { ...whereClause, ...nameSearch };
      }
    }

    // Note: Tag filtering not implemented as CommunityTag table doesn't exist in schema
    // This would require a database migration to add community tags functionality

    const communities = await prisma.community.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { id: "asc" },
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

    // Resolve banner URLs - OPTIMIZED: batch query instead of sequential
    const bannerFileIds = communities
      .map(c => c.banner_file_id)
      .filter((id): id is string => id !== null);
    
    const bannerFiles = await prisma.file.findMany({
      where: { id: { in: bannerFileIds } },
      select: {
        id: true,
        public_id: true,
        secure_url: true,
        resource_type: true,
        is_private: true,
      }
    });

    const bannerFileMap = new Map(bannerFiles.map(f => [f.id, f]));

    const communitiesWithBanner = communities.map((c) => {
      let banner_url: string | null = null;
      if (c.banner_file_id) {
        const file = bannerFileMap.get(c.banner_file_id);
        if (file) {
          if (file.is_private) {
            banner_url =
              require("../config/cloudinary").default.utils.private_download_url(
                file.public_id,
                file.resource_type,
                {
                  expires_at: Math.floor(Date.now() / 1000) + 3600,
                  attachment: false,
                }
              );
          } else {
            banner_url = file.secure_url;
          }
        }
      }

      return { ...c, banner_url };
    });

    const total = await prisma.community.count({ where: whereClause });

    res.status(200).json({
      success: true,
      data: communitiesWithBanner,
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
 * Assumes middleware has already validated authorization
 */
export const getCommunityById = async (req: Request, res: Response) => {
  const community = (req as any).community;

  try {
    const communityDetails = await prisma.community.findUnique({
      where: { id: community.id },
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

    res.status(200).json({
      success: true,
      data: {
        ...communityDetails,
        banner_url: communityDetails?.banner_file_id
          ? await (async () => {
              try {
                const file = await prisma.file.findUnique({
                  where: { id: communityDetails!.banner_file_id! },
                });
                if (!file) return null;
                if (file.is_private) {
                  return require("../config/cloudinary").default.utils.private_download_url(
                    file.public_id,
                    file.resource_type,
                    {
                      expires_at: Math.floor(Date.now() / 1000) + 3600,
                      attachment: false,
                    }
                  );
                }
                return file.secure_url;
              } catch {
                return null;
              }
            })()
          : null,
      },
    });
  } catch (error: any) {
    console.error("Get Community Error:", error);
    res.status(500).json({ message: "Failed to fetch community" });
  }
};

/**
 * Update community
 * Assumes middleware has already validated authorization and loaded community
 */
export const updateCommunity = async (req: Request, res: Response) => {
  const community = (req as any).community;
  const { name, description, type, banner_file_id } = req.body;

  try {
    // Build update data
    const updateData: any = {};
    if (name) updateData.name = sanitizeString(name);
    if (description !== undefined)
      updateData.description = description ? sanitizeString(description) : null;
    if (type && ["PUBLIC", "PRIVATE"].includes(type.toUpperCase())) {
      updateData.type = type.toUpperCase();
    }

    if (banner_file_id !== undefined) {
      // Allow clearing banner by sending null or empty string
      if (banner_file_id === null || banner_file_id === "") {
        updateData.banner_file_id = null;
      } else if (
        typeof banner_file_id === "string" &&
        isValidUUID(banner_file_id)
      ) {
        updateData.banner_file_id = banner_file_id;
      } else {
        return res.status(400).json({ message: "Invalid banner_file_id" });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updatedCommunity = await prisma.community.update({
      where: { id: community.id },
      data: updateData,
      select: communitySelect,
    });

    // Log the activity
    await ActivityLogService.logCommunityUpdated(
      (req as any).userId,
      updatedCommunity.id,
      `Updated community "${updatedCommunity.name}"`
    );

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
 * Get all communities for the authenticated user.
 * - If role is STUDENT: return communities where the student is enrolled
 * - If role is INSTRUCTOR: return communities managed by the instructor
 */
export const getMyCommunities = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  // Pagination
  const pageParam = parseInt(req.query.page as string);
  const limitParam = parseInt(req.query.limit as string);
  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit =
    !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
  const skip = (page - 1) * limit;

  try {
    if (userRole === "STUDENT") {
      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: { sid: userId },
          skip,
          take: limit,
          include: {
            Community: {
              select: {
                id: true,
                name: true,
                description: true,
                type: true,
                banner_file_id: true,
                _count: {
                  select: {
                    Enrollment: true,
                    Post: true,
                  },
                },
              },
            },
          },
        }),
        prisma.enrollment.count({ where: { sid: userId } }),
      ]);

      return res.status(200).json({
        message: "Communities retrieved successfully",
        role: "STUDENT",
        data: enrollments.map((enrollment) => enrollment.Community),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else if (userRole === "INSTRUCTOR") {
      const manages = await prisma.manages.findMany({
        where: { iid: userId },
      });

      const communityIds = manages.map((m) => m.cid);

      const [communities, total] = await Promise.all([
        prisma.community.findMany({
          where: { id: { in: communityIds } },
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            banner_file_id: true,
            _count: {
              select: {
                Enrollment: true,
                Post: true,
              },
            },
          },
        }),
        prisma.community.count({ where: { id: { in: communityIds } } }),
      ]);

      return res.status(200).json({
        message: "Communities retrieved successfully",
        role: "INSTRUCTOR",
        data: communities,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return res.status(403).json({ message: "Invalid role" });
  } catch (error) {
    console.error("Get My Communities Error:", error);
    return res.status(500).json({ message: "Failed to fetch communities" });
  }
};

/**
 * Get common communities between authenticated user and a target user
 * Includes PUBLIC and PRIVATE communities where both users are members/managers
 */
export const getCommonCommunities = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const userRole = (req as any).role;
  const targetId = parseInt(req.params.uid || "", 10);
  const pageParam = parseInt(req.query.page as string);
  const limitParam = parseInt(req.query.limit as string);
  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit =
    !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
  const skip = (page - 1) * limit;

  if (Number.isNaN(targetId)) {
    return res.status(400).json({ message: "Invalid target user id" });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });

    if (!targetUser || !targetUser.role) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const getCommunityIdsForUser = async (
      uid: number,
      role: Role
    ): Promise<Set<string>> => {
      if (role === Role.STUDENT) {
        const enrollments = await prisma.enrollment.findMany({
          where: { sid: uid },
          select: { cid: true },
        });
        return new Set(enrollments.map((e) => e.cid));
      }

      if (role === Role.INSTRUCTOR) {
        const manages = await prisma.manages.findMany({
          where: { iid: uid },
          select: { cid: true },
        });
        return new Set(manages.map((m) => m.cid));
      }

      // Admins don't enroll/manage; they have no inherent memberships
      return new Set<string>();
    };

    const targetCommunityIds = await getCommunityIdsForUser(
      targetId,
      targetUser.role
    );

    if (targetCommunityIds.size === 0) {
      return res.status(200).json({
        message: "Common communities retrieved successfully",
        data: [],
        meta: { total: 0 },
      });
    }

    // Requester memberships. Admin can be allowed to see all of target's memberships.
    let requesterCommunityIds: Set<string>;
    if (userRole === Role.ADMIN) {
      requesterCommunityIds = new Set(targetCommunityIds);
    } else {
      requesterCommunityIds = await getCommunityIdsForUser(userId, userRole);
    }

    const commonIds = [...targetCommunityIds].filter((cid) =>
      requesterCommunityIds.has(cid)
    );

    if (commonIds.length === 0) {
      return res.status(200).json({
        message: "Common communities retrieved successfully",
        data: [],
        meta: { total: 0 },
      });
    }

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where: { id: { in: commonIds } },
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          ...communitySelect,
          _count: {
            select: { Enrollment: true, Post: true },
          },
        },
      }),
      prisma.community.count({ where: { id: { in: commonIds } } }),
    ]);

    return res.status(200).json({
      message: "Common communities retrieved successfully",
      data: communities,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get Common Communities Error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch common communities" });
  }
};

/**
 * Delete community
 * Assumes middleware has already validated authorization and loaded community
 */
export const deleteCommunity = async (req: Request, res: Response) => {
  const community = (req as any).community;

  try {
    // Delete all associated data first to avoid constraint violations
    // Using transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Delete banner file if exists
      if (community.banner_file_id) {
        try {
          const bannerFile = await tx.file.findUnique({
            where: { id: community.banner_file_id },
          });

          if (bannerFile) {
            const cloudinary = require("../config/cloudinary").default;
            try {
              await cloudinary.uploader.destroy(bannerFile.public_id);
            } catch (error) {
              console.error(
                `Failed to delete banner from Cloudinary: ${bannerFile.public_id}`,
                error
              );
            }

            await tx.file.delete({
              where: { id: community.banner_file_id },
            });
          }
        } catch (error) {
          console.error("Error deleting banner file:", error);
        }
      }

      // Delete all community files
      const communityFiles = await tx.file.findMany({
        where: {
          context: "COMMUNITY_BANNER",
          context_id: String(community.id),
        },
      });

      const cloudinary = require("../config/cloudinary").default;
      for (const file of communityFiles) {
        try {
          await cloudinary.uploader.destroy(file.public_id);
        } catch (error) {
          console.error(
            `Failed to delete file from Cloudinary: ${file.public_id}`,
            error
          );
        }
      }

      await tx.file.deleteMany({
        where: {
          context: "COMMUNITY_BANNER",
          context_id: String(community.id),
        },
      });

      // Delete posts and their files
      const posts = await tx.post.findMany({
        where: { cid: community.id },
        select: { id: true },
      });

      for (const post of posts) {
        const postFiles = await tx.file.findMany({
          where: {
            context: "POST",
            context_id: String(post.id),
          },
        });

        for (const file of postFiles) {
          try {
            await cloudinary.uploader.destroy(file.public_id);
          } catch (error) {
            console.error(
              `Failed to delete file from Cloudinary: ${file.public_id}`,
              error
            );
          }
        }

        await tx.file.deleteMany({
          where: {
            context: "POST",
            context_id: String(post.id),
          },
        });
      }

      // Delete posts
      await tx.post.deleteMany({ where: { cid: community.id } });

      // Delete enrollment and manages relations
      await tx.enrollment.deleteMany({ where: { cid: community.id } });
      await tx.manages.deleteMany({ where: { cid: community.id } });

      // Log the activity BEFORE deleting the community
      await tx.activityLog.create({
        data: {
          associated_uid: (req as any).userId,
          associated_cid: community.id,
          action_type: 3, // COMMUNITY_DELETED
          description: `Deleted community "${community.name}"`,
          date: new Date(),
        },
      });

      // Delete the community
      await tx.community.delete({ where: { id: community.id } });
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
    res.status(500).json({ message: "Failed to delete community" });
  }
};

/**
 * Get members of a community
 * Assumes middleware has already validated authorization and loaded community
 */
export const getCommunityMembers = async (req: Request, res: Response) => {
  const community = (req as any).community;

  // Pagination
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit as string) || 10)
  );
  const skip = (page - 1) * limit;

  try {
    // Get enrolled students
    const students = await prisma.enrollment.findMany({
      where: { cid: community.id },
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
                avatar_file_id: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Get managing instructors
    const instructors = await prisma.manages.findMany({
      where: { cid: community.id },
      select: {
        Instructor: {
          select: {
            User: {
              select: {
                id: true,
                fname: true,
                lname: true,
                avatar_file_id: true,
                role: true,
              },
            },
          },
        },
      },
    });

    const studentList = students.map((s) => s.Student.User);
    const instructorList = instructors.map((i) => i.Instructor.User);

    const totalStudents = await prisma.enrollment.count({
      where: { cid: community.id },
    });

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
