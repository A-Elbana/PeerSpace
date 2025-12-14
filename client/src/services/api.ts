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
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

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
  }): Promise<CommunitiesListResponse> => {
    const response = await api.get("/communities", { params });
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

export default api;
