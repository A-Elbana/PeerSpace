import { Request, Response } from "express";
import prisma from "../config/prisma";
import { Role, CommunityType } from "../generated/prisma/client";

const isValidUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

/**
 * Enroll in a community (Student joins)
 * PUBLIC communities: Anyone can join
 * PRIVATE communities: Require invitation/approval (for now, simplified: INSTRUCTOR/ADMIN can add, or self-enroll is blocked)
 */
export const enrollInCommunity = async (req: Request, res: Response) => {
  const bodyCommunityId = req.body?.communityId
    ? String(req.body.communityId)
    : "";
  const paramCommunityId = req.params.id ? String(req.params.id) : "";
  const communityId = bodyCommunityId || paramCommunityId;
  const idSource = bodyCommunityId
    ? "body"
    : paramCommunityId
    ? "params"
    : null;

  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!communityId || !isValidUUID(communityId)) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  // Only STUDENT role can enroll (Instructors use Manages)
  if (userRole !== Role.STUDENT) {
    return res
      .status(403)
      .json({ message: "Only students can enroll in communities" });
  }

  try {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Invitation code enforcement: PRIVATE communities must come from body
    if (community.type === CommunityType.PRIVATE && idSource !== "body") {
      return res
        .status(400)
        .json({ message: "Invitation code required in request body" });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        cid_sid: {
          cid: communityId,
          sid: userId,
        },
      },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "Already enrolled in this community" });
    }

    // Business rule: PUBLIC communities allow self-enrollment
    // PRIVATE communities could require approval (simplified for MVP: allow enrollment)
    // To enforce approval, check if PRIVATE and return 403 unless invited

    // Simplified MVP: Allow enrollment in both PUBLIC and PRIVATE
    // For stricter control, add invitation system later

    await prisma.enrollment.create({
      data: {
        cid: communityId,
        sid: userId,
      },
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
 */
export const leaveCommunity = async (req: Request, res: Response) => {
  const communityId = req.params.id || "";
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!isValidUUID(communityId)) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  if (userRole !== Role.STUDENT) {
    return res
      .status(403)
      .json({ message: "Only students can leave communities" });
  }

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        cid_sid: {
          cid: communityId,
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
          cid: communityId,
          sid: userId,
        },
      },
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
 * Add a student to a community (INSTRUCTOR/ADMIN only)
 * Useful for private communities or bulk enrollment
 */
export const addStudentToCommunity = async (req: Request, res: Response) => {
  const communityId = req.params.id || "";
  const { studentId } = req.body;
  const userRole = (req as any).role;

  if (!isValidUUID(communityId)) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  if (!studentId || isNaN(parseInt(studentId))) {
    return res.status(400).json({ message: "Valid student ID is required" });
  }

  // Only INSTRUCTOR or ADMIN
  if (userRole !== Role.INSTRUCTOR && userRole !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Only instructors or admins can add students" });
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
          cid: communityId,
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
        cid: communityId,
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
 * Remove a student from a community (INSTRUCTOR/ADMIN only)
 */
export const removeStudentFromCommunity = async (
  req: Request,
  res: Response
) => {
  const communityId = req.params.id || "";
  const studentId = parseInt(req.params.studentId || "");
  const userRole = (req as any).role;
  const userId = (req as any).userId;

  if (!isValidUUID(communityId) || isNaN(studentId)) {
    return res.status(400).json({ message: "Invalid community or student ID" });
  }

  // Only INSTRUCTOR managing this community or ADMIN
  if (userRole !== Role.ADMIN) {
    // Check if user is instructor managing this community
    const manages = await prisma.manages.findUnique({
      where: {
        iid_cid: {
          iid: userId,
          cid: communityId,
        },
      },
    });

    if (!manages) {
      return res
        .status(403)
        .json({
          message: "Only community managers or admins can remove students",
        });
    }
  }

  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        cid_sid: {
          cid: communityId,
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
          cid: communityId,
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
