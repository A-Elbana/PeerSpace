import prisma from "../config/prisma";

class StudentService {
  /**
   * Dashboard data for a student: counts and recent items.
   */
  static async getDashboardData(userId: number) {
    // Basic statistics useful for a student dashboard
    const enrollments = await prisma.enrollment.count({
      where: { sid: userId },
    });

    // Fetch enrolled community ids first to use in assignment query
    const enrolled = await prisma.enrollment.findMany({
      where: { sid: userId },
      select: { cid: true },
    });
    const cids = enrolled.map((e) => e.cid);

    const [
      upcomingAssignments,
      badges,
      totalPosts,
      totalComments,
      submissionsCount,
      submissionsGradedCount,
      submissionsPendingCount,
      avgGradeResult,
      upcomingTasks,
    ] = await Promise.all([
      prisma.assignment.count({
        where: {
          cid: { in: cids.length ? cids : [] },
          due_date: { gte: new Date() },
        },
      }),
      prisma.studentBadge.count({ where: { sid: userId } }),
      prisma.post.count({ where: { owner_uid: userId } }),
      prisma.comment.count({ where: { commenter_uid: userId } }),
      prisma.submission.count({ where: { sid: userId } }),
      prisma.submission.count({ where: { sid: userId, grade: { not: null } } }),
      prisma.submission.count({ where: { sid: userId, grade: null } }),
      prisma.submission.aggregate({
        _avg: { grade: true },
        where: { sid: userId, grade: { not: null } },
      }),
      prisma.task.findMany({
        where: {
          author: userId,
          OR: [{ end_date: { gte: new Date() } }, { end_date: null }],
        },
        orderBy: { end_date: "asc" },
        take: 10,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          start_date: true,
          end_date: true,
        },
      }),
    ]);

    const averageGrade =
      avgGradeResult && (avgGradeResult as any)._avg
        ? (avgGradeResult as any)._avg.grade
        : null;

    return {
      enrollments,
      upcomingAssignments,
      badges,
      totalPosts,
      totalComments,
      submissions: {
        total: submissionsCount,
        graded: submissionsGradedCount,
        pending: submissionsPendingCount,
        averageGrade: averageGrade ?? null,
      },
      upcomingTasks,
    };
  }

  /**
   * Explore feed optimized for read performance using page-based pagination.
   * Supports filters: category (type), tags (comma-separated), difficulty (treated as tag), sort: new|top
   * Only shows posts from communities where the user is enrolled.
   */
  static async exploreFeed(params: any, userId: number | null) {
    const limit = Math.min(parseInt(params.limit) || 20, 50);
    const page = Math.max(parseInt(params.page) || 1, 1);
    const skip = (page - 1) * limit;
    const sort = (params.sort || "new").toString();
    const category = params.category ? params.category.toString() : undefined;
    const tags = params.tags
      ? params.tags
          .toString()
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : undefined;

    // Fetch enrolled communities for the user
    const enrolledCommunities = userId
      ? await prisma.enrollment.findMany({
          where: { sid: userId },
          select: { cid: true },
        })
      : [];
    const enrolledCids = enrolledCommunities.map((e) => e.cid);

    // Build where clause
    const where: any = {};
    // Filter posts from enrolled communities only
    if (enrolledCids.length > 0) {
      where.cid = { in: enrolledCids };
    } else if (userId) {
      // If user is enrolled in no communities, return empty
      return {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          sort,
          filters: { category, tags: [] },
        },
      };
    }

    if (category) where.type = category;
    if (tags && tags.length > 0) {
      where.PostTag = { some: { tag: { in: tags } } };
    }

    // Get total count for pagination
    const totalCount = await prisma.post.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Sorting and fetching
    if (sort === "top") {
      // For 'top' sorting by score, fetch candidate post ids and compute score, then fetch posts
      // Step 1: fetch candidate posts (limited window to compute top efficiently)
      const candidatePosts = await prisma.post.findMany({
        where,
        orderBy: [{ post_date: "desc" }],
        take: Math.max(200, limit * 4),
        select: { id: true, post_date: true },
      });

      // Optionally apply cursor by id
      let candidateIds = candidatePosts.map((p) => p.id);
      // Apply skip and take for pagination
      candidateIds = candidateIds.slice(skip, skip + limit);

      // Compute vote-based score
      if (candidateIds.length === 0) {
        return {
          data: [],
          meta: {
            page,
            limit,
            total: totalCount,
            totalPages,
            sort: "top",
            filters: { category, tags: tags || [] },
          },
        };
      }

      const votes = await prisma.voted.findMany({
        where: { pid: { in: candidateIds } },
        select: { pid: true, voteType: true },
      });
      const scoreMap: Record<number, number> = {};
      votes.forEach((v) => {
        scoreMap[v.pid] = (scoreMap[v.pid] || 0) + (v.voteType ? 1 : -1);
      });

      // Sort candidateIds by score desc then by post_date desc
      candidateIds.sort((a, b) => {
        const sa = scoreMap[a] || 0;
        const sb = scoreMap[b] || 0;
        if (sb !== sa) return sb - sa;
        const pa = candidatePosts.find((p) => p.id === a)!.post_date.getTime();
        const pb = candidatePosts.find((p) => p.id === b)!.post_date.getTime();
        return pb - pa;
      });

      const selectedIds = candidateIds.slice(0, limit);

      const posts = await prisma.post.findMany({
        where: selectedIds.length
          ? { id: { in: selectedIds } }
          : { id: { in: [] } },
        include: {
          User: {
            select: {
              id: true,
              fname: true,
              lname: true,
              avatar_file_id: true,
            },
          },
          PostFileAttachment: {
            include: {
              File: {
                select: {
                  id: true,
                  public_id: true,
                  secure_url: true,
                  resource_type: true,
                  format: true,
                  is_private: true,
                },
              },
            },
          },
          PostTag: { select: { tag: true } },
        },
      });

      // Preserve order of selectedIds
      const ordered = selectedIds
        .map((id) => posts.find((p) => p.id === id))
        .filter(Boolean) as any[];

      // Attach vote aggregates and userVote
      const enriched = await this._attachVotesAndUserVote(ordered, userId);

      return {
        data: enriched,
        meta: {
          page,
          limit,
          total: totalCount,
          totalPages,
          sort: "top",
          filters: { category, tags: tags || [] },
        },
      };
    }

    // Default 'new' sorting: order by post_date desc using page-based pagination
    const findManyArgs: any = {
      where,
      orderBy: [{ post_date: "desc" }, { id: "desc" }],
      take: limit,
      skip,
      include: {
        User: {
          select: { id: true, fname: true, lname: true, avatar_file_id: true },
        },
        PostFileAttachment: {
          include: {
            File: {
              select: {
                id: true,
                public_id: true,
                secure_url: true,
                resource_type: true,
                format: true,
                is_private: true,
              },
            },
          },
        },
        PostTag: { select: { tag: true } },
      },
    };

    const posts = await prisma.post.findMany(findManyArgs);

    const enriched = await this._attachVotesAndUserVote(posts, userId);

    return {
      data: enriched,
      meta: {
        page,
        limit,
        total: totalCount,
        totalPages,
        sort: "new",
        filters: { category, tags: tags || [] },
      },
    };
  }

  private static async _attachVotesAndUserVote(
    posts: any[],
    userId: number | null
  ) {
    const postIds = posts.map((p) => p.id);
    if (postIds.length === 0) return posts;

    // Fetch all votes in a single query (includes sid for user vote detection)
    const allVotes = await prisma.voted.findMany({
      where: { pid: { in: postIds } },
      select: { pid: true, voteType: true, sid: true },
    });

    // Get student ID for current user
    let studentId: number | null = null;
    if (userId) {
      const student = await prisma.student.findUnique({
        where: { uid: userId },
        select: { uid: true },
      });
      studentId = student?.uid ?? null;
    }

    // Compute vote counts and user vote from single query result
    const counts: Record<number, { up: number; down: number }> = {};
    const userVotesByPid: Record<number, boolean | null> = {};

    allVotes.forEach((v) => {
      // Count votes
      if (!counts[v.pid]) {
        counts[v.pid] = { up: 0, down: 0 };
      }
      if (v.voteType) counts[v.pid]!.up++;
      else counts[v.pid]!.down++;

      // Extract user's vote if this vote belongs to the current user
      if (studentId && v.sid === studentId) {
        userVotesByPid[v.pid] = v.voteType;
      }
    });

    return posts.map((p) => ({
      ...p,
      votes: {
        upvotes: counts[p.id]?.up || 0,
        downvotes: counts[p.id]?.down || 0,
        score: (counts[p.id]?.up || 0) - (counts[p.id]?.down || 0),
        userVote:
          userVotesByPid[p.id] !== undefined ? userVotesByPid[p.id] : null,
      },
    }));
  }
}

export default StudentService;
