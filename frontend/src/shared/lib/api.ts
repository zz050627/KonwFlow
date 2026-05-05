import axios from "axios";
import { toast } from "sonner";

import { storage } from "@/shared/lib/storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000
});

function isAuthRelatedMessage(message: string) {
  return /未登录|token\s*无效|not-login|login/i.test(message);
}

function resolveErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (payload && typeof payload === "object") {
      const message = (payload as { message?: unknown; error?: unknown }).message
        ?? (payload as { message?: unknown; error?: unknown }).error;
      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
    }

    if (status === 401) return "登录状态已失效，请重新登录";
    if (status === 403) return "没有权限访问该资源";
    if (status === 404) return "请求资源不存在";
    if (error.code === "ECONNABORTED") return "请求超时，请稍后重试";
    if (error.code === "ERR_NETWORK") return "网络连接失败，请检查后端服务是否正常";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "请求失败，请稍后重试";
}

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = token;
    api.defaults.headers.common.satoken = token;
  } else {
    delete api.defaults.headers.common.Authorization;
    delete api.defaults.headers.common.satoken;
  }
}

api.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) {
    config.headers.Authorization = token;
    config.headers.satoken = token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === "object" && "code" in payload) {
      if (payload.code !== "0") {
        const message = (payload.message || "请求失败").toString();
        if (isAuthRelatedMessage(message)) {
          storage.clearAuth();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(new Error(message));
      }
      return payload.data;
    }
    return payload;
  },
  (error) => {
    if (error?.response?.status === 401) {
      storage.clearAuth();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    const message = resolveErrorMessage(error);
    toast.error(message);

    if (error instanceof Error) {
      error.message = message;
      return Promise.reject(error);
    }
    return Promise.reject(new Error(message));
  }
);
