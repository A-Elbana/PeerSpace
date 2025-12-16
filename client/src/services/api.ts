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
}

export interface PostsListResponse {
  data: PostResponse[];
  meta: PaginationMeta;
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
  getCommonCommunities: async (uid: number, params?: { page?: number; limit?: number; }): Promise<{ message?: string; data: CommunityResponse[]; meta: PaginationMeta; }> => {
    const cleanParams: any = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }
    const response = await api.get(`/communities/common/${uid}`, { params: cleanParams });
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
    const cidParam = cids.join(',');
    const response = await api.get('/posts', { params: { cid: cidParam, ...params } });
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
  ): Promise<{
    id: number;
    email: string;
    fname: string;
    lname: string;
    role: string;
    avatar_file_id?: string;
    activated: boolean;
  }> => {
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
    }
  ): Promise<{
    success: boolean;
    message: string;
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
};
