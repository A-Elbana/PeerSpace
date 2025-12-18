import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { Role, CommunityType } from "@prisma/client";
import { isValidUUID, isUserMemberOfCommunity, isUserManagerOfCommunity } from "../utils/helpers";

/**
 * Extended Request with community data
 */
interface CommunityRequest extends Request {
  community?: any;
}

/**
 * Middleware: Load community by ID from params and attach to request
 * Fails with 404 if community doesn't exist
 */
export const loadCommunity = async (
  req: CommunityRequest,
  res: Response,
  next: NextFunction
) => {
  const communityId = req.params.id || req.params.communityId || "";

  if (!isValidUUID(communityId)) {
    return res.status(400).json({ message: "Invalid community ID" });
  }

  try {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    req.community = community;
    next();
  } catch (error) {
    console.error("Load Community Error:", error);
    res.status(500).json({ message: "Failed to load community" });
  }
};

/**
 * Middleware: Authorize community access
 * PUBLIC communities: accessible to everyone (including guests)
 * PRIVATE communities: accessible only to members or admins
 */
export const authorizeCommunityAccess = async (
  req: CommunityRequest,
  res: Response,
  next: NextFunction
) => {
  const community = req.community;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!community) {
    return res.status(500).json({ message: "Community not loaded" });
  }

  // PUBLIC communities are accessible to everyone
  if (community.type === CommunityType.PUBLIC) {
    return next();
  }

  // PRIVATE communities require authentication
  if (!userId) {
    return res
      .status(403)
      .json({ message: "Authentication required for private communities" });
  }

  // Admins have access to all communities
  if (userRole === Role.ADMIN) {
    return next();
  }

  // Check membership
  const isMember = await isUserMemberOfCommunity(userId, community.id);
  if (!isMember) {
    return res
      .status(403)
      .json({
        message: "You must be a member to access this private community",
      });
  }

  next();
};

/**
 * Middleware: Authorize community management
 * Only community managers (Instructors who manage this community) or Admins
 */
export const authorizeCommunityManage = async (
  req: CommunityRequest,
  res: Response,
  next: NextFunction
) => {
  const community = req.community;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!community) {
    return res.status(500).json({ message: "Community not loaded" });
  }

  // Admins can manage any community
  if (userRole === Role.ADMIN) {
    return next();
  }

  // Check if user is manager of this community
  const isManager = await isUserManagerOfCommunity(userId, community.id);
  if (!isManager) {
    return res
      .status(403)
      .json({ message: "Only community managers can perform this action" });
  }

  next();
};

/**
 * Middleware: Require user to be member of community
 * Used for actions that require membership (create post, comment, etc.)
 */
export const requireCommunityMembership = async (
  req: CommunityRequest,
  res: Response,
  next: NextFunction
) => {
  const community = req.community;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!community) {
    return res.status(500).json({ message: "Community not loaded" });
  }

  // Admins bypass membership requirement
  if (userRole === Role.ADMIN) {
    return next();
  }

  // Check membership
  const isMember = await isUserMemberOfCommunity(userId, community.id);
  if (!isMember) {
    return res
      .status(403)
      .json({ message: "You must be a member of this community" });
  }

  next();
};

/**
 * Middleware: Require instructor to manage community (from body.cid or params.cid)
 * Used for assignment/session creation and management
 * Expects cid in request body (POST/PUT) or params (DELETE)
 */
export const requireInstructorManagesCommunity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const userRole = (req as any).role;
  const cid = (req.body && req.body.cid) || (req.params && req.params.cid);

  if (!cid || !isValidUUID(cid)) {
    return res.status(400).json({ message: "Valid community ID (cid) is required" });
  }

  // Admins can manage any community
  if (userRole === Role.ADMIN) {
    return next();
  }

  // Check if user is instructor managing this community
  const isManager = await isUserManagerOfCommunity(userId, cid);
  if (!isManager) {
    return res
      .status(403)
      .json({ message: "Only instructors managing this community can perform this action" });
  }

  next();
};
