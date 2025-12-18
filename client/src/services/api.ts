import axios, {
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  removeTokens,
} from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;

interface FailedRequest {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

let failedQueue: FailedRequest[] = [];

const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle auth errors and refresh tokens
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register");

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Check if error is 401 and we have a refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();

      // If no refresh token, logout immediately
      if (!refreshToken) {
        removeTokens();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh token endpoint
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;

        // Update tokens (keep the same refresh token)
        setTokens(accessToken, refreshToken);

        // Update the failed request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Process queued requests
        processQueue(null, accessToken);

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        processQueue(refreshError, null);
        removeTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Types for API responses
export interface BadgeResponse {
  id: number;
  name: string;
  icon_url: string;
  description?: string | null;
  rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  _count?: {
    StudentBadge?: number;
  };
}

// Types for API responses
export interface CommunityResponse {
  id: string;
  name: string;
  description: string | null;
  type: "PUBLIC" | "PRIVATE";
  banner_file_id: string | null;
  banner_url?: string | null;
  _count?: {
    Enrollment: number;
    Post: number;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CommunitiesListResponse {
  success: boolean;
  data: CommunityResponse[];
  meta: PaginationMeta;
}

export interface PostResponse {
  id: number;
  title: string;
  type: string;
  body: string | null;
  post_date: string;
  is_resolved: boolean | null;
  owner_uid: number;
  cid: string;
  User: {
    id: number;
    fname: string;
    lname: string;
    avatar_file_id: string | null;
  };
  _count?: {
    Comment: number;
  };
  PostTag: { tag: string }[];
}

export interface PostsListResponse {
  data: PostResponse[];
  meta: PaginationMeta;
}

export interface UserDetail {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: string;
  avatar_file_id?: string | null;
  activated?: boolean;
  Instructor?: {
    uid: number;
    title?: string | null;
    area_of_expertise?: string | null;
    google_scholar_link?: string | null;
  } | null;
}

// Community API calls
export const communityApi = {
  create: async (data: {
    name: string;
    description?: string;
    type: "PUBLIC" | "PRIVATE";
    banner_file_id?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: CommunityResponse;
  }> => {
    const response = await api.post("/communities", data);
    return response.data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    type?: "PUBLIC" | "PRIVATE";
    memberOnly?: boolean;
    search?: string;
    tags?: string;
  }): Promise<CommunitiesListResponse> => {
    // Filter out empty/undefined parameters
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.type) cleanParams.type = params.type;
      if (params.search && params.search.trim())
        cleanParams.search = params.search.trim();
      if (params.tags && params.tags.trim())
        cleanParams.tags = params.tags.trim();
    }
    const response = await api.get("/communities", { params: cleanParams });
    return response.data;
  },

  getById: async (
    id: string
  ): Promise<{
    success: boolean;
    data: CommunityResponse & { _count: { Enrollment: number; Post: number } };
  }> => {
    const response = await api.get(`/communities/${id}`);
    return response.data;
  },

  update: async (
    id: string,
    data: {
      name?: string;
      banner_file_id?: string;
      description?: string;
      type?: "PUBLIC" | "PRIVATE";
    }
  ): Promise<{
    success: boolean;
    message: string;
    data: CommunityResponse;
  }> => {
    const response = await api.put(`/communities/${id}`, data);
    return response.data;
  },

  delete: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/communities/${id}`);
    return response.data;
  },

  getMembers: async (
    id: string,
    params?: { page?: number; limit?: number }
  ) => {
    const response = await api.get(`/communities/${id}/members`, { params });
    return response.data;
  },

  enroll: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/communities/${id}/enroll`);
    return response.data;
  },

  leave: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/communities/${id}/leave`);
    return response.data;
  },

  getShareCode: async (id: string) => {
    const response = await api.get(`/communities/${id}/share`);
    return response.data;
  },

  getMyCommunities: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    message: string;
    role: string;
    data: CommunityResponse[];
    meta: PaginationMeta;
  }> => {
    const response = await api.get("/communities/mine", { params });
    return response.data;
  },
  getCommonCommunities: async (
    uid: number,
    params?: { page?: number; limit?: number }
  ): Promise<{
    message?: string;
    data: CommunityResponse[];
    meta: PaginationMeta;
  }> => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }
    const response = await api.get(`/communities/common/${uid}`, {
      params: cleanParams,
    });
    return response.data;
  },
};

// Helper function to transform badge names (remove underscores)
const transformBadge = (badge: BadgeResponse): BadgeResponse => ({
  ...badge,
  name: badge.name.replace(/_/g, ' '),
});

export const badgeApi = {
  // Create a new badge (Admin only)
  create: async (data: {
    name: string;
    description?: string;
    rarity?: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  }): Promise<{
    message: string;
    badge: BadgeResponse;
  }> => {
    const response = await api.post("/badges", data);
    return {
      ...response.data,
      badge: transformBadge(response.data.badge),
    };
  },

  // Get all badges with pagination
  getAll: async (params?: { page?: number; limit?: number }): Promise<{
    message: string;
    data: BadgeResponse[];
    meta: PaginationMeta;
  }> => {
    const cleanParams: Record<string, number> = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }
    const response = await api.get("/badges", { params: cleanParams });
    return {
      ...response.data,
      data: response.data.data.map(transformBadge),
    };
  },

  // Get badges earned by the authenticated student
  getMine: async (params?: { page?: number; limit?: number }): Promise<{
    message: string;
    data: { Badge: BadgeResponse }[];
    meta: PaginationMeta;
  }> => {
    const cleanParams: Record<string, number> = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }
    const response = await api.get("/badges/me", { params: cleanParams });
    return {
      ...response.data,
      data: response.data.data.map((entry: any) => ({
        ...entry,
        Badge: transformBadge(entry.Badge),
      })),
    };
  },

  // Get badges earned by a specific user
  getByUserId: async (
    uid: number,
    params?: { page?: number; limit?: number }
  ): Promise<{
    message: string;
    data: { Badge: BadgeResponse }[];
    meta: PaginationMeta;
  }> => {
    const cleanParams: Record<string, number> = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }
    const response = await api.get(`/badges/user/${uid}`, {
      params: cleanParams,
    });
    return {
      ...response.data,
      data: response.data.data.map((entry: any) => ({
        ...entry,
        Badge: transformBadge(entry.Badge),
      })),
    };
  },

  // Get a single badge by ID
  getById: async (id: number): Promise<{
    message: string;
    badge: BadgeResponse;
  }> => {
    const response = await api.get(`/badges/${id}`);
    return {
      ...response.data,
      badge: transformBadge(response.data.badge),
    };
  },

  // Update a badge (Admin only)
  update: async (
    id: number,
    data: {
      name?: string;
      description?: string;
      rarity?: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
    }
  ): Promise<{
    message: string;
    badge: BadgeResponse;
  }> => {
    const response = await api.put(`/badges/${id}`, data);
    return {
      ...response.data,
      badge: transformBadge(response.data.badge),
    };
  },

  // Delete a badge (Admin only)
  delete: async (id: number): Promise<{
    message: string;
    deletedCount: number;
  }> => {
    const response = await api.delete(`/badges/${id}`);
    return response.data;
  },
};
// Post API calls (for all post types including announcements)
export const postApi = {
  create: async (data: {
    title: string;
    type: string;
    body?: string;
    cid: string;
    file_ids?: string[];
  }): Promise<PostResponse> => {
    const response = await api.post("/posts", data);
    return response.data;
  },

  getByCommunity: async (
    cid: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<PostsListResponse> => {
    const response = await api.get("/posts", { params: { cid, ...params } });
    return response.data;
  },

  getByCommunities: async (
    cids: string[],
    params?: { page?: number; limit?: number }
  ): Promise<PostsListResponse> => {
    const cidParam = cids.join(",");
    const response = await api.get("/posts", {
      params: { cid: cidParam, ...params },
    });
    return response.data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string;
    communityId?: string;
  }): Promise<PostsListResponse> => {
    // Filter out empty/undefined parameters
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.search && params.search.trim())
        cleanParams.search = params.search.trim();
      if (params.tags && params.tags.trim())
        cleanParams.tags = params.tags.trim();
      if (params.communityId && params.communityId.trim())
        cleanParams.communityId = params.communityId.trim();
    }
    const response = await api.get("/posts/all", { params: cleanParams });
    return response.data;
  },

  // Get posts created by the authenticated user
  getMyPosts: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    message?: string;
    data: PostResponse[];
    meta: PaginationMeta;
  }> => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }
    const response = await api.get("/posts/me", { params: cleanParams });
    return response.data;
  },

  getById: async (id: number): Promise<PostResponse> => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  update: async (
    id: number,
    data: {
      title?: string;
      body?: string;
      type?: string;
      is_resolved?: boolean;
      file_ids?: string[];
    }
  ): Promise<PostResponse> => {
    const response = await api.put(`/posts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/posts/${id}`);
    return response.data;
  },

  toggleResolved: async (id: number): Promise<PostResponse> => {
    const response = await api.patch(`/posts/${id}/resolve`);
    return response.data;
  },

  // Get posts by target user in common communities
  getCommonPosts: async (
    uid: number,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<PostsListResponse> => {
    const response = await api.get(`/posts/common/${uid}`, { params });
    return response.data;
  },
};

// Vote API calls
export const voteApi = {
  // Get vote info (public endpoint)
  getVoteInfo: async (
    postId: number
  ): Promise<{
    postId: number;
    upvotes: number;
    downvotes: number;
    score: number;
    userVote: boolean | null;
  }> => {
    const response = await api.get(`/votes/${postId}`);
    return response.data;
  },

  // Cast or update vote (requires auth)
  votePost: async (postId: number, voteType: boolean) => {
    const response = await api.post(`/votes`, { postId, voteType });
    return response.data;
  },

  // Remove vote
  removeVote: async (postId: number) => {
    const response = await api.delete(`/votes/${postId}`);
    return response.data;
  },
};

// Announcement API calls (Posts with type 'announcement')
export const announcementApi = {
  create: async (data: {
    title: string;
    body: string;
    cid: string;
  }): Promise<PostResponse> => {
    const response = await api.post("/posts", {
      ...data,
      type: "announcement",
    });
    return response.data;
  },

  getByCommunity: async (
    cid: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<PostsListResponse> => {
    // The backend doesn't filter by type in the query, so we get all posts
    // and the frontend will need to filter by type if needed
    const response = await api.get("/posts", { params: { cid, ...params } });
    return response.data;
  },

  getById: async (id: number): Promise<PostResponse> => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  update: async (
    id: number,
    data: {
      title?: string;
      body?: string;
    }
  ): Promise<PostResponse> => {
    const response = await api.put(`/posts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/posts/${id}`);
    return response.data;
  },
};

// Instructor API (instructor-specific endpoints)
export const instructorApi = {
  // Get feed posts from managed communities (paginated, supports sort=top|new)
  getFeed: async (params?: {
    page?: number;
    limit?: number;
    resolved?: string;
    cid?: string;
    sort?: "new" | "top" | string;
  }): Promise<PostsListResponse> => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.resolved) cleanParams.resolved = params.resolved;
      if (params.cid) cleanParams.cid = params.cid;
      if (params.sort) cleanParams.sort = params.sort;
    }
    const response = await api.get("/instructor/feed/posts", {
      params: cleanParams,
    });
    return response.data;
  },

  // Get managed communities (paginated)
  getManagedCommunities: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.search && params.search.trim())
        cleanParams.search = params.search.trim();
    }
    const response = await api.get("/instructor/communities", {
      params: cleanParams,
    });
    return response.data as {
      success: boolean;
      data: CommunityResponse[];
      meta: PaginationMeta;
    };
  },

  // Get unresolved posts across managed communities
  getUnresolvedPosts: async (params?: {
    page?: number;
    limit?: number;
    cid?: string;
  }) => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.cid) cleanParams.cid = params.cid;
    }
    const response = await api.get("/instructor/posts/unresolved", {
      params: cleanParams,
    });
    return response.data as PostsListResponse;
  },

  // Get submissions across managed communities
  getManagedSubmissions: async (params?: {
    page?: number;
    limit?: number;
    cid?: string;
    aid?: number;
    graded?: string;
    sid?: number;
  }) => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.cid) cleanParams.cid = params.cid;
      if (params.aid) cleanParams.aid = params.aid;
      if (params.graded) cleanParams.graded = params.graded;
      if (params.sid) cleanParams.sid = params.sid;
    }
    const response = await api.get("/instructor/submissions", {
      params: cleanParams,
    });
    return response.data;
  },

  // Grade a submission
  gradeSubmission: async (
    id: number,
    data: { grade: number; feedback?: string }
  ) => {
    const response = await api.patch(
      `/instructor/submissions/${id}/grade`,
      data
    );
    return response.data;
  },

  // Get instructor insights (overview or detailed by cid)
  getInsights: async (params?: { cid?: string }) => {
    const cleanParams: any = {};
    if (params && params.cid) cleanParams.cid = params.cid;
    const response = await api.get("/instructor/insights", {
      params: cleanParams,
    });
    return response.data;
  },
  // Get assignments created by the authenticated instructor (paginated)
  getInstructorAssignments: async (params?: { page?: number; limit?: number; cid?: string }) => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.cid) cleanParams.cid = params.cid;
    }
    const response = await api.get('/instructor/assignments', { params: cleanParams });
    return response.data as {
      success: boolean;
      data: Array<{
        id: number;
        title: string;
        description?: string;
        due_date: string | null;
        max_points: number | null;
        canBeLate: boolean;
        assigner_uid: number;
        cid: string;
        _count: { Submission: number };
        AssignmentFileAttachment?: Array<{
          fid: string;
          File: { id: string; secure_url: string; is_private: boolean; public_id?: string; resource_type?: string; format?: string };
        }>;
        Community?: { id: string; name: string };
      }>;
      meta: PaginationMeta;
    };
  },
};

// Student API (student-specific endpoints)
export const studentApi = {
  // Explore feed for students (only posts from communities where the student is enrolled)
  getFeed: async (params?: {
    page?: number;
    limit?: number;
    sort?: "new" | "top" | string;
    category?: string;
    tags?: string;
  }): Promise<PostsListResponse> => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.sort) cleanParams.sort = params.sort;
      if (params.category) cleanParams.category = params.category;
      if (params.tags) cleanParams.tags = params.tags;
    }
    const response = await api.get('/student/explore', { params: cleanParams });
    return response.data as PostsListResponse;
  },

  // Student dashboard summary
  getDashboard: async (): Promise<{ data: any }> => {
    const response = await api.get('/student/dashboard');
    return response.data;
  },
};

// Comment API
export const commentApi = {
  getByPost: async (
    pid: number,
    params?: {
      includeReplies?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
    }
  ) => {
    const cleanParams: any = { pid };
    if (params) {
      if (params.includeReplies !== undefined)
        cleanParams.includeReplies = params.includeReplies;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.sortBy) cleanParams.sortBy = params.sortBy;
    }
    const response = await api.get("/comments", { params: cleanParams });
    return response.data;
  },

  // Fetch first-level replies for a comment
  getReplies: async (
    commentId: number,
    params?: { page?: number; limit?: number }
  ) => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }
    const response = await api.get(`/comments/${commentId}/replies`, {
      params: cleanParams,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/comments/${id}`);
    return response.data;
  },

  create: async (data: {
    pid: number;
    content: string;
    parentCommentId?: number;
  }) => {
    const response = await api.post("/comments", data);
    return response.data;
  },

  update: async (id: number, data: { content: string }) => {
    const response = await api.put(`/comments/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  },
  toggleApproveInstructor: async (id: number) => {
    const response = await api.patch(`/comments/${id}/toggle-approve-inst`);
    return response.data;
  },
  toggleApproveOriginalPoster: async (id: number) => {
    const response = await api.patch(`/comments/${id}/toggle-approve-op`);
    return response.data;
  },
};

// File API calls
export const fileApi = {
  create: async (data: {
    public_id: string;
    secure_url: string;
    resource_type: string;
    format?: string;
    context:
    | "POST"
    | "SUBMISSION"
    | "NOTE"
    | "ASSIGNMENT"
    | "COMMUNITY_BANNER"
    | "USER_AVATAR";
    context_id: string;
    is_private?: boolean;
  }) => {
    const response = await api.post("/files", data);
    return response.data;
  },

  getByContext: async (context: string, contextId: string) => {
    const response = await api.get("/files", {
      params: { context, context_id: contextId },
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/files/${id}`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/files/${id}`);
    return response.data;
  },
};

// Admin API calls
export const adminApi = {
  getStats: async (): Promise<{
    totalUsers: number;
    totalCommunities: number;
    totalPosts: number;
  }> => {
    const response = await api.get("/admin/stats");
    return response.data;
  },

  getCommunitiesTimeSeries: async (
    months: number = 6
  ): Promise<{
    data: Array<{ date: string; count: number }>;
  }> => {
    const response = await api.get("/admin/analytics/communities/time-series", {
      params: { months },
    });
    return response.data;
  },

  getPostsTimeSeries: async (params?: {
    months?: number;
    communityId?: string;
    tag?: string;
    resolvedOnly?: boolean;
  }): Promise<{
    data: Array<{ date: string; count: number }>;
  }> => {
    const response = await api.get("/admin/analytics/posts/time-series", {
      params,
    });
    return response.data;
  },

  getActivityLogs: async (params?: {
    page?: number;
    limit?: number;
    userId?: number;
    communityId?: string;
    actionType?: number;
    startDate?: string;
    endDate?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{
    success: boolean;
    data: Array<{
      id: number;
      associated_uid?: number;
      associated_cid?: string;
      action_type: number;
      date: string;
      User?: {
        id: number;
        fname: string;
        lname: string;
        email: string;
      };
      Community?: {
        id: string;
        name: string;
        type: string;
      };
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      filters: any;
    };
  }> => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.userId) cleanParams.userId = params.userId;
      if (params.communityId) cleanParams.communityId = params.communityId;
      if (params.actionType) cleanParams.actionType = params.actionType;
      if (params.startDate) cleanParams.startDate = params.startDate;
      if (params.endDate) cleanParams.endDate = params.endDate;
      if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
    }
    const response = await api.get("/admin/activity-logs", {
      params: cleanParams,
    });
    return response.data;
  },
};

// User API calls
export const userApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<{
    data: Array<{
      id: number;
      email: string;
      fname: string;
      lname: string;
      role: string;
      avatar_file_id?: string;
      activated: boolean;
    }>;
    meta: PaginationMeta;
  }> => {
    // Filter out empty/undefined parameters
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.search && params.search.trim())
        cleanParams.search = params.search.trim();
      if (params.role && params.role !== "all") cleanParams.role = params.role;
    }
    const response = await api.get("/users", { params: cleanParams });
    return response.data;
  },

  getById: async (
    id: string
  ): Promise<UserDetail> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  update: async (
    id: string,
    data: {
      fname?: string;
      lname?: string;
      email?: string;
      role?: string;
      password?: string;
      currentPassword?: string;
      title?: string;
      area_of_expertise?: string;
      google_scholar_link?: string;
      avatar_file_id?: string | null;
    }
  ): Promise<{
    message: string;
    user: UserDetail;
  }> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// Assignment API calls
export const assignmentApi = {
  create: async (data: {
    title: string;
    description?: string;
    cid: string;
    due_date?: string;
    max_points?: number;
    canBeLate?: boolean;
    file_ids?: string[];
  }): Promise<{
    id: number;
    title: string;
    description?: string;
    due_date: string | null;
    max_points: number | null;
    canBeLate: boolean;
    assigner_uid: number;
    cid: string;
    Instructor: {
      uid: number;
      User: {
        id: number;
        fname: string;
        lname: string;
      };
    };
    Community: {
      id: string;
      name: string;
    };
  }> => {
    const response = await api.post("/assignments", data);
    return response.data;
  },

  getByCommunity: async (
    cid: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{
    data: Array<{
      id: number;
      title: string;
      description?: string;
      due_date: string | null;
      max_points: number | null;
      canBeLate: boolean;
      assigner_uid: number;
      cid: string;
      Instructor: {
        uid: number;
        User: {
          id: number;
          fname: string;
          lname: string;
        };
      };
      _count: {
        Submission: number;
      };
    }>;
    meta: PaginationMeta;
  }> => {
    const response = await api.get("/assignments", {
      params: { cid, ...params },
    });
    return response.data;
  },

  getById: async (
    id: number
  ): Promise<{
    id: number;
    title: string;
    description?: string;
    due_date: string | null;
    max_points: number | null;
    canBeLate: boolean;
    assigner_uid: number;
    cid: string;
    Instructor: {
      uid: number;
      User: {
        id: number;
        fname: string;
        lname: string;
      };
    };
    Community: {
      id: string;
      name: string;
    };
  }> => {
    const response = await api.get(`/assignments/${id}`);
    return response.data;
  },

  update: async (
    id: number,
    data: {
      title?: string;
      description?: string;
      due_date?: string | null;
      max_points?: number | null;
      canBeLate?: boolean;
      file_ids?: string[];
    }
  ): Promise<{
    message: string;
    assignment: {
      id: number;
      title: string;
      description?: string;
      due_date: string | null;
      max_points: number | null;
      canBeLate: boolean;
      assigner_uid: number;
      cid: string;
      Instructor: {
        uid: number;
        User: {
          id: number;
          fname: string;
          lname: string;
        };
      };
      Community: {
        id: string;
        name: string;
      };
    };
  }> => {
    const response = await api.put(`/assignments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/assignments/${id}`);
    return response.data;
  },
};

// Submission API calls
export const submissionApi = {
  create: async (data: {
    aid: number;
    comment?: string;
    fileIds?: string[];
  }): Promise<{
    success: boolean;
    data: {
      id: number;
      aid: number;
      sid: number;
      subm_date: string;
      grade: number | null;
      feedback: string | null;
      comment: string | null;
    };
  }> => {
    const response = await api.post("/submissions", data);
    return response.data;
  },

  update: async (
    id: number,
    data: { comment?: string }
  ): Promise<{
    success: boolean;
    data: {
      id: number;
      aid: number;
      sid: number;
      subm_date: string;
      grade: number | null;
      feedback: string | null;
      comment: string | null;
    };
  }> => {
    const response = await api.put(`/submissions/${id}`, data);
    return response.data;
  },

  delete: async (
    id: number
  ): Promise<{ success: boolean; message?: string }> => {
    const response = await api.delete(`/submissions/${id}`);
    return response.data;
  },

  getMySubmissions: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: Array<{
      id: number;
      aid: number;
      sid: number;
      subm_date: string;
      grade: number | null;
      feedback: string | null;
      comment: string | null;
      Assignment: {
        id: number;
        title: string;
        cid: string;
      };
    }>;
    meta: PaginationMeta;
  }> => {
    const response = await api.get("/submissions/mine", { params });
    return response.data;
  },

  getById: async (id: number): Promise<{
    success: boolean;
    data: {
      id: number;
      aid: number;
      sid: number;
      subm_date: string;
      grade: number | null;
      feedback: string | null;
      comment: string | null;
      Assignment: any;
      SubmissionFileAttachment?: Array<{ File: any }>;
    };
  }> => {
    const response = await api.get(`/submissions/${id}`);
    return response.data;
  },

  getByAssignment: async (
    aid: number,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{
    data: Array<{
      id: number;
      aid: number;
      sid: number;
      subm_date: string;
      grade: number | null;
      feedback: string | null;
      Student: {
        uid: number;
        User: {
          id: number;
          fname: string;
          lname: string;
        };
      };
    }>;
    meta: PaginationMeta;
  }> => {
    const response = await api.get("/submissions", {
      params: { aid, ...params },
    });
    return response.data;
  },
};

export default api;

// Notifications API
export const notificationsApi = {
  getNotifications: async (params?: { page?: number; pageSize?: number }) => {
    const response = await api.get("/notifications", { params });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get("/notifications/count");
    return response.data;
  },

  markAsRead: async (id: number) => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.post("/notifications/mark-all-read");
    return response.data;
  },

  deleteNotification: async (id: number) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await api.delete("/notifications");
    return response.data;
  },
};
