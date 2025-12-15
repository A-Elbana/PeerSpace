import { Request, Response } from "express";
import prisma from "../config/prisma";
import { isValidUUID, isUserMemberOfCommunity } from "../utils/helpers";

/**
 * Extended Request with session data
 */
interface SessionRequest extends Request {
  session?: any;
}

/**
 * Create/start a session in a community.
 * Expects: cid (uuid), title (string), start_time (ISO string), meet_url (string)
 * Requires: authenticateToken + validateSessionCreate + requireInstructorManagesCommunity middleware
 */
export const createSession = async (req: Request, res: Response) => {
  const { cid, title, start_time, meet_url } = req.body;
  const userId = (req as any).userId;

  try {
    // Verify community exists (middleware already checked instructor manages it)
    const community = await prisma.community.findUnique({
      where: { id: String(cid) },
    });

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Check if a session already exists for this community (one active session per community)
    const existingSession = await prisma.session.findUnique({
      where: { cid: String(cid) },
    });

    if (existingSession) {
      return res.status(409).json({
        message: "A session is already active for this community. End the current session before starting a new one.",
      });
    }

    const session = await prisma.session.create({
      data: {
        cid: String(cid),
        title: String(title).trim(),
        start_time: new Date(start_time),
        meet_url: String(meet_url).trim(),
      },
      include: {
        Community: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({
      message: "Session started successfully",
      session,
    });
  } catch (error) {
    console.error("Create Session Error:", error);
    res.status(500).json({ message: "Failed to start session" });
  }
};

/**
 * Get the active session for a community.
 * Expects: cid (query param)
 * Requires: authenticateToken + community membership check
 */
export const getSessionByCommunity = async (req: Request, res: Response) => {
  const cid = req.query.cid as string;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

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
          message: "You must be a member of this community to view the session",
        });
      }
    }

    // Get active session
    const session = await prisma.session.findUnique({
      where: { cid },
      include: {
        Community: {
          select: { id: true, name: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ message: "No active session found for this community" });
    }

    res.status(200).json(session);
  } catch (error) {
    console.error("Get Session Error:", error);
    res.status(500).json({ message: "Failed to fetch session" });
  }
};

/**
 * Update an active session.
 * Expects: cid (path param), title (optional), start_time (optional), meet_url (optional)
 * Requires: authenticateToken + validateSessionUpdate + requireInstructorManagesCommunity middleware
 */
export const updateSession = async (req: Request, res: Response) => {
  const { cid } = req.params;
  const { title, start_time, meet_url } = req.body;

  // Validate cid
  if (!cid || !isValidUUID(cid)) {
    return res
      .status(400)
      .json({ message: "Valid community ID (cid) is required" });
  }

  // Build update data object with only provided fields
  const updateData: {
    title?: string;
    start_time?: Date;
    meet_url?: string;
  } = {};

  if (title !== undefined) {
    updateData.title = String(title).trim();
  }

  if (start_time !== undefined) {
    updateData.start_time = new Date(start_time);
  }

  if (meet_url !== undefined) {
    updateData.meet_url = String(meet_url).trim();
  }

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  try {
    // Check if session exists
    const existingSession = await prisma.session.findUnique({
      where: { cid: String(cid) },
    });

    if (!existingSession) {
      return res.status(404).json({ message: "No active session found for this community" });
    }

    const updatedSession = await prisma.session.update({
      where: { cid: String(cid) },
      data: updateData,
      include: {
        Community: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(200).json({
      message: "Session updated successfully",
      session: updatedSession,
    });
  } catch (error) {
    console.error("Update Session Error:", error);
    res.status(500).json({ message: "Failed to update session" });
  }
};

/**
 * Delete/end an active session.
 * Expects: cid (path param)
 * Requires: authenticateToken + requireInstructorManagesCommunity middleware
 */
export const deleteSession = async (req: Request, res: Response) => {
  const { cid } = req.params;

  // Validate cid
  if (!cid || !isValidUUID(cid)) {
    return res
      .status(400)
      .json({ message: "Valid community ID (cid) is required" });
  }

  try {
    // Check if session exists
    const existingSession = await prisma.session.findUnique({
      where: { cid: String(cid) },
    });

    if (!existingSession) {
      return res.status(404).json({ message: "No active session found for this community" });
    }

    await prisma.session.delete({
      where: { cid: String(cid) },
    });

    res.status(200).json({ message: "Session ended successfully" });
  } catch (error) {
    console.error("Delete Session Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    res.status(500).json({ 
      message: "Failed to end session",
      error: process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
};
