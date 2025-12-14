import { Request, Response } from "express";
import prisma from "../config/prisma";
import { isValidUUID, isUserMemberOfCommunity } from "../utils/helpers";

/**
 * Extended Request with assignment data
 */
interface AssignmentRequest extends Request {
  assignment?: any;
}

/**
 * Create an assignment in a community.
 * Expects: title (string), cid (uuid), due_date (ISO string, optional), max_points (number, optional)
 * assigner_uid is taken from the authenticated user's token (req.userId)
 * Requires: authenticateToken + validateAssignmentCreate + requireInstructorManagesCommunity middleware
 */
export const createAssignment = async (req: Request, res: Response) => {
  const { title, description, cid, due_date, max_points, canBeLate } = req.body;
  const userId = (req as any).userId;

  try {
    // Verify community exists (middleware already checked instructor manages it)
    const community = await prisma.community.findUnique({
      where: { id: String(cid) },
    });

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        cid: String(cid),
        due_date: due_date ? new Date(due_date) : null,
        max_points: max_points !== undefined ? parseFloat(max_points) : null,
        canBeLate: canBeLate !== undefined ? Boolean(canBeLate) : true,
        assigner_uid: userId,
      },
      include: {
        Instructor: {
          include: {
            User: {
              select: { id: true, fname: true, lname: true },
            },
          },
        },
        Community: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Create Assignment Error:", error);
    res.status(500).json({ message: "Failed to create assignment" });
  }
};

/**
 * Get all assignments for a community with pagination.
 * Expects: cid (query param), page (optional), limit (optional)
 * Requires: authenticateToken + community membership check
 */
export const getAssignmentsByCommunity = async (
  req: Request,
  res: Response
) => {
  const cid = req.query.cid as string;
  const userId = (req as any).userId;
  const userRole = (req as any).role;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Validate cid
  if (!cid || !isValidUUID(cid)) {
    return res
      .status(400)
      .json({ message: "Valid community ID (cid) is required" });
  }

  try {
    // Check community exists
    const community = await prisma.community.findUnique({
      where: { id: cid },
    });

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Admins bypass membership check
    if (userRole !== "ADMIN") {
      // Check if user is a member of the community
      const isMember = await isUserMemberOfCommunity(userId, cid);
      if (!isMember) {
        return res.status(403).json({
          message: "You must be a member of this community to view assignments",
        });
      }
    }

    // Get assignments with pagination
    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where: { cid },
        skip,
        take: limit,
        orderBy: { due_date: "asc" }, // Upcoming assignments first
        include: {
          Instructor: {
            include: {
              User: {
                select: { id: true, fname: true, lname: true },
              },
            },
          },
          _count: {
            select: { Submission: true },
          },
        },
      }),
      prisma.assignment.count({ where: { cid } }),
    ]);

    res.status(200).json({
      data: assignments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Assignments by Community Error:", error);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
};

/**
 * Get a single assignment by ID.
 * Expects: id (path param)
 * Requires: authenticateToken + loadAssignment + authorizeAssignmentAccess middleware
 * req.assignment is set by loadAssignment middleware
 */
export const getAssignmentById = async (
  req: AssignmentRequest,
  res: Response
) => {
  // Assignment already loaded and access authorized by middleware
  res.status(200).json(req.assignment);
};

/**
 * Update an assignment.
 * Expects: id (path param), title (optional), due_date (optional), max_points (optional)
 * Requires: authenticateToken + loadAssignment + authorizeAssignmentManage middleware
 * req.assignment is set by loadAssignment middleware
 */
export const updateAssignment = async (
  req: AssignmentRequest,
  res: Response
) => {
  const assignment = req.assignment;
  const { title, description, due_date, max_points, canBeLate } = req.body;

  // Build update data object with only provided fields
  const updateData: {
    title?: string;
    description?: string | null;
    due_date?: Date | null;
    max_points?: number | null;
    canBeLate?: boolean;
  } = {};

  if (title !== undefined) {
    updateData.title = String(title).trim();
  }

  if (description !== undefined) {
    updateData.description =
      description !== null ? String(description).trim() : null;
  }

  if (due_date !== undefined) {
    // Allow setting due_date to null by passing null or empty string
    updateData.due_date = due_date ? new Date(due_date) : null;
  }

  if (max_points !== undefined) {
    // Allow setting max_points to null by passing null
    updateData.max_points = max_points !== null ? parseFloat(max_points) : null;
  }

  if (canBeLate !== undefined) {
    updateData.canBeLate = Boolean(canBeLate);
  }

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  try {
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignment.id },
      data: updateData,
      include: {
        Instructor: {
          include: {
            User: {
              select: { id: true, fname: true, lname: true },
            },
          },
        },
        Community: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(200).json({
      message: "Assignment updated successfully",
      assignment: updatedAssignment,
    });
  } catch (error) {
    console.error("Update Assignment Error:", error);
    res.status(500).json({ message: "Failed to update assignment" });
  }
};

/**
 * Delete an assignment.
 * Expects: id (path param)
 * Requires: authenticateToken + loadAssignment + authorizeAssignmentManage middleware
 * req.assignment is set by loadAssignment middleware
 */
export const deleteAssignment = async (
  req: AssignmentRequest,
  res: Response
) => {
  const assignment = req.assignment;

  try {
    // Delete related records first (file attachments, submissions, etc.)
    // Using transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete assignment file attachments
      await tx.assignmentFileAttachment.deleteMany({
        where: { aid: assignment.id },
      });

      // Delete submissions for this assignment
      await tx.submission.deleteMany({
        where: { aid: assignment.id },
      });

      // Delete task-assignment relations
      await tx.taskAssignmentRelation.deleteMany({
        where: { aid: assignment.id },
      });

      // Finally, delete the assignment
      await tx.assignment.delete({
        where: { id: assignment.id },
      });
    });

    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("Delete Assignment Error:", error);
    res.status(500).json({ message: "Failed to delete assignment" });
  }
};
