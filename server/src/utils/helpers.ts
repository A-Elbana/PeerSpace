import prisma from "../config/prisma";

/**
 * Validates if a string is a valid UUID
 */
export const isValidUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

/**
 * Helper to check if user is a member of a community
 * (Student enrolled OR Instructor managing)
 */
export const isUserMemberOfCommunity = async (
  userId: number,
  communityId: string
): Promise<boolean> => {
  // Check Enrollment (Student)
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      cid_sid: {
        cid: communityId,
        sid: userId,
      },
    },
  });
  if (enrollment) return true;

  // Check Manages (Instructor)
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

/**
 * Helper to check if user is an instructor/manager of a community
 */
export const isUserManagerOfCommunity = async (
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

/**
 * Helper to check if two students have at least one common community (both enrolled)
 */
export const hasCommonCommunity = async (
  userId1: number,
  userId2: number
): Promise<boolean> => {
  const user1Communities = await prisma.enrollment.findMany({
    where: { sid: userId1 },
    select: { cid: true },
  });

  const user1CommunityIds = new Set(user1Communities.map((e) => e.cid));

  if (user1CommunityIds.size === 0) {
    return false;
  }

  const user2Communities = await prisma.enrollment.findMany({
    where: { sid: userId2 },
    select: { cid: true },
  });

  const user2CommunityIds = user2Communities.map((e) => e.cid);

  return user2CommunityIds.some((cid) => user1CommunityIds.has(cid));
};
