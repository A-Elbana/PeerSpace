import { Request, Response } from "express";
import prisma from "../config/prisma";

/**
 * Get platform statistics
 * Admin only - returns total counts of users, communities, and posts
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalCommunities, totalPosts] = await Promise.all([
      prisma.user.count(),
      prisma.community.count(),
      prisma.post.count(),
    ]);

    res.status(200).json({
      totalUsers,
      totalCommunities,
      totalPosts,
    });
  } catch (error: any) {
    console.error("Get Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
};

/**
 * Get communities growth over time
 * Returns time-series data showing community creation over months
 */
export const getCommunitiesTimeSeries = async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const monthsToFetch = Math.min(Math.max(months, 1), 24); // Limit 1-24 months

    // Get all communities with creation date (using first post as proxy, or id-based estimation)
    // Since we don't have created_at, we'll use post_date from first post in community
    // Or we can estimate based on community ID if it's UUID v1 with timestamp
    // For now, let's aggregate by month using a simpler approach

    // Get communities and group by month estimation
    const communities = await prisma.community.findMany({
      select: {
        id: true,
        Post: {
          select: {
            post_date: true,
          },
          orderBy: {
            post_date: "asc",
          },
          take: 1,
        },
      },
    });

    // Create date buckets
    const now = new Date();
    const dataBuckets: { [key: string]: number } = {};

    for (let i = monthsToFetch - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      dataBuckets[monthStr] = 0;
    }

    // Count communities by their estimated creation month
    // If community has posts, use first post date; otherwise assume it's recent
    communities.forEach((community) => {
      let creationDate: Date;

      if (community.Post && community.Post.length > 0 && community.Post[0]) {
        creationDate = new Date(community.Post[0].post_date);
      } else {
        // No posts, assume created this month
        creationDate = now;
      }

      const monthStr = creationDate.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      if (dataBuckets[monthStr] !== undefined) {
        dataBuckets[monthStr]++;
      }
    });

    // Convert to array format for chart
    const data = Object.entries(dataBuckets).map(([date, count]) => ({
      date,
      count,
    }));

    res.status(200).json({ data });
  } catch (error: any) {
    console.error("Get Communities Time Series Error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch communities time series" });
  }
};

/**
 * Get posts growth over time with optional filters
 * Returns time-series data showing post creation over months
 */
export const getPostsTimeSeries = async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const monthsToFetch = Math.min(Math.max(months, 1), 24); // Limit 1-24 months
    const communityId = req.query.communityId as string | undefined;
    const tag = req.query.tag as string | undefined;
    const resolvedOnly = req.query.resolvedOnly === "true";

    // Build where clause
    const whereClause: any = {};

    if (communityId) {
      whereClause.cid = communityId;
    }

    if (resolvedOnly) {
      whereClause.is_resolved = true;
    }

    // If tag filter is specified, we need to join with PostTag
    let posts;
    if (tag) {
      posts = await prisma.post.findMany({
        where: {
          ...whereClause,
          PostTag: {
            some: {
              Tag: {
                name: {
                  contains: tag,
                  mode: "insensitive",
                },
              },
            },
          },
        },
        select: {
          post_date: true,
        },
      });
    } else {
      posts = await prisma.post.findMany({
        where: whereClause,
        select: {
          post_date: true,
        },
      });
    }

    // Create date buckets
    const now = new Date();
    const dataBuckets: { [key: string]: number } = {};

    for (let i = monthsToFetch - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      dataBuckets[monthStr] = 0;
    }

    // Count posts by month
    posts.forEach((post) => {
      const postDate = new Date(post.post_date);
      const monthStr = postDate.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      if (dataBuckets[monthStr] !== undefined) {
        dataBuckets[monthStr]++;
      }
    });

    // Convert to array format for chart
    const data = Object.entries(dataBuckets).map(([date, count]) => ({
      date,
      count,
    }));

    res.status(200).json({ data });
  } catch (error: any) {
    console.error("Get Posts Time Series Error:", error);
    res.status(500).json({ message: "Failed to fetch posts time series" });
  }
};
