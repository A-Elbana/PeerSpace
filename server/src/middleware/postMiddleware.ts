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
 * Helper to check if user is in community (Student enrolled or Instructor managing)
 */
export const isUserInCommunity = async (
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
  if (manages) return true;

  return false;
};

/**
 * Helper to check if user is an instructor of the community
 */
export const isInstructorOfCommunity = async (
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
 * Helper to check community access (public vs private)
 */
export const canAccessCommunity = async (
  userId: number | undefined,
  communityId: string,
  userRole: string | undefined
): Promise<{ allowed: boolean; message?: string }> => {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });

  if (!community) {
    return { allowed: false, message: "Community not found" };
  }

  // PUBLIC communities: everyone can access
  if (community.type === "PUBLIC") {
    return { allowed: true };
  }

  // PRIVATE communities: require authentication
  if (!userId) {
    return {
      allowed: false,
      message: "Authentication required for private communities",
    };
  }

  // Admins have access to all
  if (userRole === "ADMIN") {
    return { allowed: true };
  }

  // Check membership
  const isMember = await isUserInCommunity(userId, communityId);
  if (!isMember) {
    return {
      allowed: false,
      message: "You must be a member of this private community",
    };
  }

  return { allowed: true };
};
