import { Request, Response } from "express";
import prisma from "../config/prisma";
import { Role, CommunityType } from "../generated/prisma/client";
import ActivityLogService, {
  ActivityActionType,
} from "../services/ActivityLogService";

const isValidUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

/**
 * Enroll in a community (Student joins)
 * Assumes middleware has already validated community access
 * PUBLIC communities: Anyone can join
 * PRIVATE communities: Require invitation code (passed in body)
 */
export const enrollInCommunity = async (req: Request, res: Response) => {
  const community = (req as any).community;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  // Only STUDENT role can enroll
  if (userRole !== Role.STUDENT) {
    return res
      .status(403)
      .json({ message: "Only students can enroll in communities" });
  }

  try {
    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        cid_sid: {
          cid: community.id,
          sid: userId,
        },
      },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "Already enrolled in this community" });
    }

    await prisma.enrollment.create({
      data: {
        cid: community.id,
        sid: userId,
      },
    });

    // Log join event
    await ActivityLogService.logActivity({
      userId,
      communityId: community.id,
      actionType: ActivityActionType.USER_JOINED_COMMUNITY,
      description: `Joined community "${community.name || community.id}"`,
    });

    res.status(201).json({
      success: true,
      message: `Successfully enrolled in community`,
    });
  } catch (error: any) {
    console.error("Enroll Error:", error);
    if (error.code === "P2003") {
      return res.status(400).json({ message: "Invalid community or user ID" });
    }
    res.status(500).json({ message: "Failed to enroll in community" });
  }
};

/**
 * Leave a community (Student unenrolls)
 * Assumes middleware has already validated community and loaded it
 */
export const leaveCommunity = async (req: Request, res: Response) => {
  const community = (req as any).community;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (userRole !== Role.STUDENT) {
    return res
      .status(403)
      .json({ message: "Only students can leave communities" });
  }

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        cid_sid: {
          cid: community.id,
          sid: userId,
        },
      },
    });

    if (!enrollment) {
      return res
        .status(404)
        .json({ message: "You are not enrolled in this community" });
    }

    await prisma.enrollment.delete({
      where: {
        cid_sid: {
          cid: community.id,
          sid: userId,
        },
      },
    });

    // Log leave event
    await ActivityLogService.logActivity({
      userId,
      communityId: community.id,
      actionType: ActivityActionType.USER_LEFT_COMMUNITY,
      description: `Left community "${community.name || community.id}"`,
    });

    res.status(200).json({
      success: true,
      message: "Successfully left the community",
    });
  } catch (error: any) {
    console.error("Leave Community Error:", error);
    res.status(500).json({ message: "Failed to leave community" });
  }
};

/**
 * Add a student to a community (INSTRUCTOR/ADMIN managing this community)
 * Assumes middleware has already validated authorization and loaded community
 */
export const addStudentToCommunity = async (req: Request, res: Response) => {
  const community = (req as any).community;
  const { studentId } = req.body;

  if (!studentId || isNaN(parseInt(studentId))) {
    return res.status(400).json({ message: "Valid student ID is required" });
  }

  try {
    const targetStudentId = parseInt(studentId);

    // Verify student exists and has STUDENT role
    const student = await prisma.student.findUnique({
      where: { uid: targetStudentId },
      include: { User: true },
    });

    if (!student || student.User.role !== Role.STUDENT) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        cid_sid: {
          cid: community.id,
          sid: targetStudentId,
        },
      },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "Student already enrolled in this community" });
    }

    await prisma.enrollment.create({
      data: {
        cid: community.id,
        sid: targetStudentId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Student added to community successfully",
    });
  } catch (error: any) {
    console.error("Add Student Error:", error);
    if (error.code === "P2003") {
      return res
        .status(400)
        .json({ message: "Invalid community or student ID" });
    }
    res.status(500).json({ message: "Failed to add student to community" });
  }
};

/**
 * Remove a student from a community
 * Assumes middleware has already validated authorization and loaded community
 */
export const removeStudentFromCommunity = async (
  req: Request,
  res: Response
) => {
  const community = (req as any).community;
  const studentId = parseInt(req.params.studentId || "");

  if (isNaN(studentId)) {
    return res.status(400).json({ message: "Invalid student ID" });
  }

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        cid_sid: {
          cid: community.id,
          sid: studentId,
        },
      },
    });

    if (!enrollment) {
      return res
        .status(404)
        .json({ message: "Student not enrolled in this community" });
    }

    await prisma.enrollment.delete({
      where: {
        cid_sid: {
          cid: community.id,
          sid: studentId,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Student removed from community successfully",
    });
  } catch (error: any) {
    console.error("Remove Student Error:", error);
    res
      .status(500)
      .json({ message: "Failed to remove student from community" });
  }
};
