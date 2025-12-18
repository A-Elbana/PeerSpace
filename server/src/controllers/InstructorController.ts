import { Request, Response } from "express";
import prisma from "../config/prisma";
import { Role } from "../generated/prisma/client";
import { isValidUUID } from "../utils/helpers";
import { count } from "node:console";

const parsePageLimit = (req: Request) => {
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(
    50,
    Math.max(1, parseInt((req.query.limit as string) || "10"))
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const getManagedCommunityIds = async (
  instructorId: number
): Promise<string[]> => {
  const manages = await prisma.manages.findMany({
    where: { iid: instructorId },
    select: { cid: true },
  });
  return manages.map((m) => m.cid);
};

export const getMyCommunities = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { page, limit, skip } = parsePageLimit(req);
  const search = (req.query.search as string | undefined)?.trim();

  try {
    const managedIds = await getManagedCommunityIds(userId);
    if (managedIds.length === 0) {
      return res
        .status(200)
        .json({
          success: true,
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        });
    }

    const where: any = { id: { in: managedIds } };
    if (search && search.length > 0) {
      if (isValidUUID(search)) {
        where.id = search;
      } else {
        where.name = { contains: search, mode: "insensitive" };
      }
    }

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          banner_file_id: true,
          _count: {
            select: { Enrollment: true, Post: true, Assignment: true },
          },
        },
      }),
      prisma.community.count({ where }),
    ]);

    // Batch resolve banner URLs (only for non-null IDs)
    const bannerIds = communities
      .map((c) => c.banner_file_id)
      .filter((id): id is string => !!id);
    const fileMap = bannerIds.length
      ? new Map(
          (
            await prisma.file.findMany({
              where: { id: { in: bannerIds } },
              select: {
                id: true,
                public_id: true,
                secure_url: true,
                resource_type: true,
                is_private: true,
              },
            })
          ).map((f) => [f.id, f] as const)
        )
      : new Map();

    const cloudinary = require("../config/cloudinary").default;

    // Transform synchronously (no async/await in map)
    const data = communities.map((c) => {
      let banner_url: string | null = null;
      if (c.banner_file_id) {
        const f = fileMap.get(c.banner_file_id);
        if (f) {
          banner_url = f.is_private
            ? cloudinary.utils.private_download_url(
                f.public_id,
                f.resource_type,
                {
                  expires_at: Math.floor(Date.now() / 1000) + 3600,
                  attachment: false,
                }
              )
            : f.secure_url;
        }
      }
      return { ...c, banner_url };
    });

    return res.status(200).json({
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Instructor getMyCommunities Error:", error);
    return res.status(500).json({ message: "Failed to fetch communities" });
  }
};

/**
 * Get assignments created by the authenticated instructor
 * - Uses `assigner_uid` = token user id
 * - Paginated, includes submission counts and related community
 */
export const getMyAssignments = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "10")));
  const skip = (page - 1) * limit;

  try {
    const where = { assigner_uid: userId } as any;

    // Optional community filter
    const cid = req.query.cid as string | undefined;
    if (cid) {
      // basic validation: length check; leave UUID validation to caller if needed
      where.cid = cid;
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { due_date: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          due_date: true,
          max_points: true,
          canBeLate: true,
          cid: true,
          assigner_uid: true,
          _count: { select: { Submission: true } },
          AssignmentFileAttachment: {
            select: {
              fid: true,
              File: { select: { id: true, secure_url: true, is_private: true, public_id: true, resource_type: true, format: true } },
            },
          },
          Community: { select: { id: true, name: true } },
        },
      }),
      prisma.assignment.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: assignments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get My Assignments Error:", error);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
};

export const getInstructorFeedPosts = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { page, limit, skip } = parsePageLimit(req);
  const resolvedParam = req.query.resolved as unknown;
  const rawCid = req.query.cid as string | string[] | undefined;
  const sort = ((req.query.sort as string | undefined) || "new").toLowerCase();

  let filterCids: string[] | undefined;
  if (rawCid) {
    if (Array.isArray(rawCid)) filterCids = rawCid.map(String);
    else
      filterCids = rawCid
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  }

  try {
    const managedIds = await getManagedCommunityIds(userId);
    if (managedIds.length === 0) {
      return res
        .status(200)
        .json({
          success: true,
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        });
    }
    const allowedIds = filterCids
      ? filterCids.filter((id) => managedIds.includes(id))
      : managedIds;
    if (allowedIds.length === 0) {
      return res
        .status(403)
        .json({ message: "No access to requested communities" });
    }

    const where: any = { cid: { in: allowedIds } };

    // Normalize resolved query parameter which may be string or boolean
    let resolvedFilter: boolean | undefined;
    if (resolvedParam !== undefined && resolvedParam !== null) {
      if (typeof resolvedParam === "boolean") {
        resolvedFilter = resolvedParam;
      } else {
        const r = String(resolvedParam).toLowerCase();
        if (r === "true") resolvedFilter = true;
        else if (r === "false") resolvedFilter = false;
      }
    }

    if (resolvedFilter !== undefined) {
      where.is_resolved = resolvedFilter;
    }

    const total = await prisma.post.count({ where });

    // For 'top' sorting, we need vote scores; fetch a larger window, sort in-memory, then paginate
    const fetchSkip = sort === "new" ? skip : 0;
    const fetchTake =
      sort === "new" ? limit : Math.min(Math.max(limit * 3, 50), 300);

    const posts = await prisma.post.findMany({
      where,
      skip: fetchSkip,
      take: fetchTake,
      orderBy: { post_date: "desc" },
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        post_date: true,
        is_resolved: true,
        owner_uid: true,
        cid: true,
        _count: { select: { Comment: true } },
        User: {
          select: { id: true, fname: true, lname: true, avatar_file_id: true, Instructor: true },
        },
        PostFileAttachment: {
          select: {
            fid: true,
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
        PostTag: {
          select: {
            tag: true,
          },
        },
      },
    });

    // Batch fetch votes and avatars
    const postIds = posts.map((p) => p.id);
    const userIds = posts.map((p) => p.User.id);

    const [votes, avatarFiles] = await Promise.all([
      prisma.voted.findMany({
        where: { pid: { in: postIds } },
        select: { pid: true, voteType: true },
      }),
      userIds.length
        ? prisma.file.findMany({
            where: {
              id: {
                in: posts
                  .map((p) => p.User.avatar_file_id)
                  .filter((id): id is string => !!id),
              },
            },
            select: {
              id: true,
              public_id: true,
              secure_url: true,
              resource_type: true,
              is_private: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // Build vote aggregates
    const votesByPost = new Map<
      number,
      { upvotes: number; downvotes: number }
    >();
    postIds.forEach((pid) =>
      votesByPost.set(pid, { upvotes: 0, downvotes: 0 })
    );
    votes.forEach((v) => {
      const agg = votesByPost.get(v.pid)!;
      if (v.voteType) agg.upvotes++;
      else agg.downvotes++;
    });

    const avatarMap = new Map(avatarFiles.map((f) => [f.id, f] as const));

    let enriched = posts.map((p) => {
      const v = votesByPost.get(p.id) || { upvotes: 0, downvotes: 0 };
      const tags = p.PostTag.map((pt) => pt.tag);
      const { PostTag, ...postData } = p;
      return {
        ...postData,
        tags,
        User: {
          ...p.User,
          avatar_url: p.User.avatar_file_id
            ? avatarMap.get(p.User.avatar_file_id)
            : null,
        },
        votes: {
          upvotes: v.upvotes,
          downvotes: v.downvotes,
          score: v.upvotes - v.downvotes,
        },
      };
    });

    if (sort === "top") {
      enriched = enriched.sort((a, b) => {
        const scoreDiff = (b as any).votes.score - (a as any).votes.score;
        if (scoreDiff !== 0) return scoreDiff;
        return (
          new Date((b as any).post_date).getTime() -
          new Date((a as any).post_date).getTime()
        );
      });
      const start = (page - 1) * limit;
      enriched = enriched.slice(start, start + limit);
    }

    return res
      .status(200)
      .json({
        success: true,
        data: enriched,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
  } catch (error) {
    console.error("Instructor getInstructorFeedPosts Error:", error);
    return res.status(500).json({ message: "Failed to fetch posts" });
  }
};

export const getUnresolvedPosts = async (req: Request, res: Response) => {
  // Create a shallow clone of the request with resolved forced to 'false'
  const clonedReq = Object.assign({}, req, {
    query: { ...(req.query as any), resolved: "false" },
  }) as Request;

  return getInstructorFeedPosts(clonedReq, res);
};

export const getManagedSubmissions = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { page, limit, skip } = parsePageLimit(req);
  const cid = req.query.cid as string | undefined;
  const aidParam = req.query.aid as string | undefined;
  const gradedParam = req.query.graded as string | undefined;
  const studentIdParam = req.query.sid as string | undefined;

  try {
    const managedIds = await getManagedCommunityIds(userId);
    if (managedIds.length === 0) {
      return res
        .status(200)
        .json({
          success: true,
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        });
    }

    const where: any = {};

    if (cid) {
      if (!isValidUUID(cid))
        return res.status(400).json({ message: "Invalid community id" });
      if (!managedIds.includes(cid))
        return res.status(403).json({ message: "Not managing this community" });
      where.Assignment = { cid };
    } else {
      where.Assignment = { cid: { in: managedIds } };
    }

    if (aidParam) {
      const aid = Number(aidParam);
      if (Number.isNaN(aid))
        return res.status(400).json({ message: "Invalid assignment id" });
      const assignment = await prisma.assignment.findUnique({
        where: { id: aid },
        select: { cid: true },
      });
      if (!assignment)
        return res.status(404).json({ message: "Assignment not found" });
      if (!managedIds.includes(assignment.cid))
        return res
          .status(403)
          .json({ message: "Not managing assignment's community" });
      delete where.Assignment;
      where.aid = aid;
    }

    if (gradedParam === "true") where.grade = { not: null };
    if (gradedParam === "false") where.grade = null;

    if (studentIdParam) {
      const sid = Number(studentIdParam);
      if (Number.isNaN(sid))
        return res.status(400).json({ message: "Invalid student id" });
      where.sid = sid;
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { subm_date: "desc" },
        select: {
          id: true,
          subm_date: true,
          grade: true,
          feedback: true,
          aid: true,
          sid: true,
          Assignment: {
            select: {
              id: true,
              title: true,
              cid: true,
              due_date: true,
              max_points: true,
            },
          },
          Student: {
            select: {
              uid: true,
              User: {
                select: {
                  id: true,
                  fname: true,
                  lname: true,
                  email: true,
                  avatar_file_id: true,
                },
              },
            },
          },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    // Batch fetch student avatars
    const studentAvatarIds = submissions
      .map((s) => s.Student.User.avatar_file_id)
      .filter((id): id is string => !!id);

    const avatarMap = studentAvatarIds.length
      ? new Map(
          (
            await prisma.file.findMany({
              where: { id: { in: studentAvatarIds } },
              select: {
                id: true,
                public_id: true,
                secure_url: true,
                resource_type: true,
                is_private: true,
              },
            })
          ).map((f) => [f.id, f] as const)
        )
      : new Map();

    // Batch fetch submission file attachments
    const submissionIds = submissions.map((s) => s.id);
    const fileAttachments = submissionIds.length
      ? await prisma.submissionFileAttachment.findMany({
          where: { subid: { in: submissionIds } },
          select: {
            subid: true,
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
        })
      : [];

    const attachmentsBySubId = new Map<number, typeof fileAttachments>();
    fileAttachments.forEach((att) => {
      if (!attachmentsBySubId.has(att.subid!))
        attachmentsBySubId.set(att.subid!, []);
      attachmentsBySubId.get(att.subid!)!.push(att);
    });

    const data = submissions.map((s) => ({
      ...s,
      Student: {
        ...s.Student,
        User: {
          ...s.Student.User,
          avatar_url: s.Student.User.avatar_file_id
            ? avatarMap.get(s.Student.User.avatar_file_id)
            : null,
        },
      },
      SubmissionFileAttachment: attachmentsBySubId.get(s.id) || [],
    }));

    return res
      .status(200)
      .json({
        success: true,
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
  } catch (error) {
    console.error("Instructor getManagedSubmissions Error:", error);
    return res.status(500).json({ message: "Failed to fetch submissions" });
  }
};

export const getInstructorInsights = async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const cid = req.query.cid as string | undefined;

  try {
    const managedIds = await getManagedCommunityIds(userId);
    if (managedIds.length === 0) {
      return res.status(200).json({ success: true, data: cid ? null : [] });
    }

    if (cid) {
      if (!isValidUUID(cid))
        return res.status(400).json({ message: "Invalid community id" });
      if (!managedIds.includes(cid))
        return res.status(403).json({ message: "Not managing this community" });

      const [
        studentsCount,
        postsCount,
        unresolvedPosts,
        assignmentsCount,
        submissionsCount,
        avgGrade,
        submissionsBySid,
      ] = await Promise.all([
        prisma.enrollment.count({ where: { cid } }),
        prisma.post.count({ where: { cid } }),
        prisma.post.count({ where: { cid, is_resolved: false } }),
        prisma.assignment.count({ where: { cid } }),
        prisma.submission.count({ where: { Assignment: { cid } } }),
        prisma.submission.aggregate({
          _avg: { grade: true },
          where: { Assignment: { cid }, grade: { not: null } },
        }),
        prisma.submission.findMany({
          where: { Assignment: { cid } },
          select: { sid: true },
        }),
      ]);

      const sidCounts = new Map<number, number>();
      submissionsBySid.forEach((s) => {
        sidCounts.set(s.sid, (sidCounts.get(s.sid) || 0) + 1);
      });
      const sortedSids = Array.from(sidCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((e) => e[0]);

      const studentUsers = sortedSids.length
        ? await prisma.user.findMany({
            where: { id: { in: sortedSids } },
            select: {
              id: true,
              fname: true,
              lname: true,
              avatar_file_id: true,
            },
          })
        : [];
      const studentMap = new Map(studentUsers.map((u) => [u.id, u] as const));

      return res.status(200).json({
        success: true,
        data: {
          cid,
          studentsCount,
          postsCount,
          unresolvedPosts,
          assignmentsCount,
          submissionsCount,
          averageGrade: avgGrade._avg.grade,
          topStudents: sortedSids.map((sid) => ({
            submissions: sidCounts.get(sid) || 0,
            student: studentMap.get(sid) || { id: sid },
          })),
        },
      });
    }

    // Batch insights for all managed communities
    const [allPosts, submissionByCommunity, communities] = await Promise.all([
      prisma.post.findMany({
        where: { cid: { in: managedIds } },
        select: { cid: true, is_resolved: true },
      }),
      prisma.submission.findMany({
        where: { Assignment: { cid: { in: managedIds } } },
        select: { Assignment: { select: { cid: true } } },
      }),
      prisma.community.findMany({
        where: { id: { in: managedIds } },
        select: { id: true, name: true },
      }),
    ]);

    // Build community name map
    const communityNameMap = new Map(
      communities.map((c) => [c.id, c.name] as const)
    );

    // Build post metrics
    const postMetrics = new Map<
      string,
      { postsCount: number; unresolvedPosts: number }
    >();
    managedIds.forEach((id) =>
      postMetrics.set(id, { postsCount: 0, unresolvedPosts: 0 })
    );
    allPosts.forEach((p) => {
      const m = postMetrics.get(p.cid)!;
      m.postsCount++;
      if (!p.is_resolved) m.unresolvedPosts++;
    });

    // Build submission counts by community
    const submissionCounts = new Map<string, number>();
    managedIds.forEach((id) => submissionCounts.set(id, 0));
    submissionByCommunity.forEach((s) => {
      submissionCounts.set(
        s.Assignment.cid,
        (submissionCounts.get(s.Assignment.cid) || 0) + 1
      );
    });

    const data = managedIds.map((id) => ({
      cid: id,
      name: communityNameMap.get(id) || "Unknown",
      postsCount: postMetrics.get(id)?.postsCount || 0,
      unresolvedPosts: postMetrics.get(id)?.unresolvedPosts || 0,
      submissionsCount: submissionCounts.get(id) || 0,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Instructor getInstructorInsights Error:", error);
    return res.status(500).json({ message: "Failed to fetch insights" });
  }
};
