import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

/**
 * Extended Request with assignment data
 */
interface AssignmentRequest extends Request {
  assignment?: any;
}

/**
 * UUID validation helper
 */
const isValidUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

/**
 * Middleware: Ensure the requester is an Instructor who manages the given community.
 * Expects `req.body.cid` (for POST) or `req.params.cid` and that `authenticateToken` ran earlier
 * so `req.userId` and `req.role` are available.
 * Admins bypass this check.
 */
export const requireInstructorManagesCommunity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const role = (req as any).role as string | undefined;
  const cid = (req.body && req.body.cid) || (req.params && req.params.cid);

  if (!cid) {
    return res.status(400).json({ message: "Community ID (cid) is required" });
  }

  if (!isValidUUID(String(cid))) {
    return res.status(400).json({ message: "Invalid community ID format" });
  }

  if (!userId) {
    return res
      .status(401)
      .json({ message: "Authentication required" });
  }

  // Admins bypass instructor check
  if (role === "ADMIN") {
    return next();
  }

  // Only instructors may create/manage assignments
  if (role !== "INSTRUCTOR") {
    return res
      .status(403)
      .json({ message: "Only instructors can manage assignments" });
  }

  try {
    // Check if instructor manages this community
    const manages = await prisma.manages.findUnique({
      where: {
        iid_cid: {
          iid: userId,
          cid: String(cid),
        },
      },
    });

    if (!manages) {
      return res
        .status(403)
        .json({ message: "You do not manage this community" });
    }

    next();
  } catch (error) {
    console.error("requireInstructorManagesCommunity error:", error);
    res.status(500).json({ message: "Failed to validate instructor permissions" });
  }
};

/**
 * Middleware: Load assignment by ID from params and attach to request.
 * Fails with 404 if assignment doesn't exist.
 */
export const loadAssignment = async (
  req: AssignmentRequest,
  res: Response,
  next: NextFunction
) => {
  const assignmentId = parseInt(req.params.id || req.params.assignmentId || "");

  if (isNaN(assignmentId)) {
    return res.status(400).json({ message: "Invalid assignment ID" });
  }

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        Community: true,
        Instructor: {
          include: {
            User: {
              select: { id: true, fname: true, lname: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    req.assignment = assignment;
    next();
  } catch (error) {
    console.error("loadAssignment error:", error);
    res.status(500).json({ message: "Failed to load assignment" });
  }
};

/**
 * Middleware: Authorize assignment management (update/delete).
 * Only the assigner (instructor who created it) or Admins can modify.
 * Must be used after loadAssignment.
 */
export const authorizeAssignmentManage = async (
  req: AssignmentRequest,
  res: Response,
  next: NextFunction
) => {
  const assignment = req.assignment;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!assignment) {
    return res.status(500).json({ message: "Assignment not loaded" });
  }

  // Admins can manage any assignment
  if (userRole === "ADMIN") {
    return next();
  }

  // Only the instructor who created the assignment can manage it
  if (assignment.assigner_uid !== userId) {
    return res
      .status(403)
      .json({ message: "Only the assignment creator or an admin can modify this assignment" });
  }

  next();
};

/**
 * Middleware: Authorize assignment access (view).
 * Members of the community (students enrolled or instructors managing) can view.
 * Admins can view all.
 */
export const authorizeAssignmentAccess = async (
  req: AssignmentRequest,
  res: Response,
  next: NextFunction
) => {
  const assignment = req.assignment;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!assignment) {
    return res.status(500).json({ message: "Assignment not loaded" });
  }

  // Admins can access any assignment
  if (userRole === "ADMIN") {
    return next();
  }

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    // Check if user is a member of the community
    // Check enrollment (Student)
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        cid_sid: {
          cid: assignment.cid,
          sid: userId,
        },
      },
    });

    if (enrollment) return next();

    // Check manages (Instructor)
    const manages = await prisma.manages.findUnique({
      where: {
        iid_cid: {
          iid: userId,
          cid: assignment.cid,
        },
      },
    });

    if (manages) return next();

    return res
      .status(403)
      .json({ message: "You must be a member of this community to view assignments" });
  } catch (error) {
    console.error("authorizeAssignmentAccess error:", error);
    res.status(500).json({ message: "Failed to authorize access" });
  }
};
