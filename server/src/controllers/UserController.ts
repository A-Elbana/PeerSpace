import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../config/prisma";
import { Role } from "../generated/prisma/client";

// Security constants
const BCRYPT_ROUNDS = 12;

// Standard user selection to exclude sensitive data
const userSelect = {
  id: true,
  email: true,
  fname: true,
  lname: true,
  role: true,
  avatar_file_id: true,
  activated: true,
};

// Helper for sanitization
const sanitizeString = (input: string): string => {
  return input.trim().substring(0, 255);
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      skip,
      take: limit,
      select: userSelect,
      orderBy: { id: "asc" },
    });

    const total = await prisma.user.count();

    res.status(200).json({
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get All Users Error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }
  const userId = parseInt(id);

  if (isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error: any) {
    console.error("Get User By ID Error:", error);
    res.status(500).json({ message: "Failed to fetch user details" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }
  const targetUserId = parseInt(id);
  const requestingUserId = (req as any).userId;
  const requestingUserRole = (req as any).role;

  if (isNaN(targetUserId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  // Authorization: Users can only update themselves, Admins can update anyone
  if (targetUserId !== requestingUserId && requestingUserRole !== "ADMIN") {
    return res
      .status(403)
      .json({ message: "You are not authorized to update this user" });
  }

  const { fname, lname, avatar_file_id, password, currentPassword } = req.body;

  try {
    const updateData: any = {};
    if (fname) updateData.fname = sanitizeString(fname);
    if (lname) updateData.lname = sanitizeString(lname);

    // Handle avatar file update (delete old avatar if changing)
    if (avatar_file_id) {
      // Get current user to check if they have an old avatar
      const currentUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { avatar_file_id: true },
      });

      if (
        currentUser?.avatar_file_id &&
        currentUser.avatar_file_id !== avatar_file_id
      ) {
        // Delete old avatar file
        try {
          const oldFile = await prisma.file.findUnique({
            where: { id: currentUser.avatar_file_id },
          });

          if (oldFile) {
            const cloudinary = require("../config/cloudinary").default;
            try {
              await cloudinary.uploader.destroy(oldFile.public_id);
            } catch (error) {
              console.error(
                `Failed to delete old avatar from Cloudinary: ${oldFile.public_id}`,
                error
              );
            }

            await prisma.file.delete({
              where: { id: currentUser.avatar_file_id },
            });
          }
        } catch (error) {
          console.error("Error deleting old avatar file:", error);
        }
      }

      updateData.avatar_file_id = avatar_file_id;
    }

    // Handle password update with secure hashing
    if (password) {
      // Require current password to change password
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password",
        });
      }

      // Fetch the user's current hashed password
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { hashedPassword: true },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.hashedPassword
      );
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      // Hash and set new password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      updateData.hashedPassword = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: userSelect,
    });

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Update User Error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Failed to update user" });
  }
};

/**
 * Get all communities for the authenticated user.
 * - If role is STUDENT: return communities where the student is enrolled
 * - If role is INSTRUCTOR: return communities managed by the instructor
 * Headers only; implementation to be added later.
 */
export const getMyCommunities = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  try {
    if (userRole === "STUDENT") {
      const communities = await prisma.enrollment.findMany({
        where: { sid: userId },
        include: {
          Community: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
            },
          },
        },
      });

      return res.status(200).json({
        message: "Communities retrieved successfully",
        role: "STUDENT",
        data: communities.map((enrollment) => enrollment.Community),
      });
    } else if (userRole === "INSTRUCTOR") {
      const manages = await prisma.manages.findMany({
        where: { iid: userId },
      });

      // Fetch communities separately by their IDs
      const communityIds = manages.map((m) => m.cid);
      const communities = await prisma.community.findMany({
        where: { id: { in: communityIds } },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
        },
      });

      return res.status(200).json({
        message: "Communities retrieved successfully",
        role: "INSTRUCTOR",
        data: communities,
      });
    }

    return res.status(403).json({ message: "Invalid role" });
  } catch (error) {
    console.error("Get My Communities Error:", error);
    return res.status(500).json({ message: "Failed to fetch communities" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }
  const targetUserId = parseInt(id);
  const requestingUserId = (req as any).userId;
  const requestingUserRole = (req as any).role;

  if (isNaN(targetUserId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  // Authorization: Users can only delete themselves, Admins can delete anyone
  if (targetUserId !== requestingUserId && requestingUserRole !== "ADMIN") {
    return res
      .status(403)
      .json({ message: "You are not authorized to delete this user" });
  }

  try {
    // Get user to check for avatar file
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { avatar_file_id: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete avatar file if exists
    if (user.avatar_file_id) {
      try {
        const avatarFile = await prisma.file.findUnique({
          where: { id: user.avatar_file_id },
        });

        if (avatarFile) {
          const cloudinary = require("../config/cloudinary").default;
          try {
            await cloudinary.uploader.destroy(avatarFile.public_id);
          } catch (error) {
            console.error(
              `Failed to delete avatar from Cloudinary: ${avatarFile.public_id}`,
              error
            );
          }

          await prisma.file.delete({
            where: { id: user.avatar_file_id },
          });
        }
      } catch (error) {
        console.error("Error deleting avatar file:", error);
      }
    }

    // Delete all user avatar files (context=USER_AVATAR)
    const userFiles = await prisma.file.findMany({
      where: {
        context: "USER_AVATAR",
        context_id: String(targetUserId),
      },
    });

    const cloudinary = require("../config/cloudinary").default;
    for (const file of userFiles) {
      try {
        await cloudinary.uploader.destroy(file.public_id);
      } catch (error) {
        console.error(
          `Failed to delete file from Cloudinary: ${file.public_id}`,
          error
        );
      }
    }

    await prisma.file.deleteMany({
      where: {
        context: "USER_AVATAR",
        context_id: String(targetUserId),
      },
    });

    // Delete the user
    await prisma.user.delete({
      where: { id: targetUserId },
    });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Delete User Error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    if (error.code === "P2003") {
      return res.status(409).json({
        message: "Cannot delete user because they have associated records.",
      });
    }
    res.status(500).json({ message: "Failed to delete user" });
  }
};

/**
 * Create a new admin user.
 * Only existing admins can create new admins.
 * Creates both User record and Admin record.
 */
export const createAdmin = async (req: Request, res: Response) => {
  const { email, password, fname, lname } = req.body;

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user and admin record in a transaction
    const newAdmin = await prisma.$transaction(async (tx) => {
      // Create the user with ADMIN role
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          hashedPassword: hashedPassword,
          fname: sanitizeString(fname),
          lname: sanitizeString(lname),
          role: Role.ADMIN,
          activated: true,
        },
        select: userSelect,
      });

      // Create the Admin record
      await tx.admin.create({
        data: {
          uid: user.id,
        },
      });

      return user;
    });

    return res.status(201).json({
      message: "Admin created successfully",
      user: newAdmin,
    });
  } catch (error: any) {
    console.error("Create Admin Error:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Email already registered" });
    }
    return res.status(500).json({ message: "Failed to create admin" });
  }
};

