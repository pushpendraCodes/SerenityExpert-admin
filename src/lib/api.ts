import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse, PaginatedResponse } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ACCESS_KEY = "adminAccessToken";
const REFRESH_KEY = "adminRefreshToken";
const USER_KEY = "adminUser";

/** Clear old localStorage keys — admin now uses sessionStorage only. */
export function clearLegacyAdminStorage() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function setAdminSessionTokens(accessToken: string | null, refreshToken: string | null) {
  clearLegacyAdminStorage();
  if (accessToken) sessionStorage.setItem(ACCESS_KEY, accessToken);
  else sessionStorage.removeItem(ACCESS_KEY);
  if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
  else sessionStorage.removeItem(REFRESH_KEY);
}

export function setAdminSessionUser(userJson: string | null) {
  clearLegacyAdminStorage();
  if (userJson) sessionStorage.setItem(USER_KEY, userJson);
  else sessionStorage.removeItem(USER_KEY);
}

export function clearAdminSessionTokens() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
  clearLegacyAdminStorage();
}

export function getAdminAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY);
}

export function getAdminRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY);
}

export function getAdminSessionUserRaw() {
  return sessionStorage.getItem(USER_KEY);
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAdminAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

/** Refresh access token. Shared so boot + 401 interceptor use one in-flight request. */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getAdminRefreshToken();
  if (!refreshToken) return null;

  if (!refreshing) {
    refreshing = (async () => {
      try {
        const { data } = await axios.post<
          ApiResponse<{ accessToken: string; refreshToken: string }>
        >(`${API_URL}/auth/refresh`, { refreshToken });
        if (data.data?.accessToken) {
          setAdminSessionTokens(
            data.data.accessToken,
            data.data.refreshToken || refreshToken
          );
          return data.data.accessToken;
        }
        clearAdminSessionTokens();
        return null;
      } catch {
        clearAdminSessionTokens();
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }

  return refreshing;
}

/** Ensure usable access token before protected calls (on tab boot). */
export async function ensureFreshSession(): Promise<boolean> {
  const accessToken = getAdminAccessToken();
  const refreshToken = getAdminRefreshToken();
  if (!accessToken && !refreshToken) return false;
  if (refreshToken) {
    const token = await refreshAccessToken();
    return Boolean(token);
  }
  return Boolean(accessToken);
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/**
 * Extract field-level validation errors from a backend ValidationError response.
 * Backend returns `{ message, errors: { field: ["msg", ...] } }`.
 * Returns a flat `{ field: "first message" }` map for easy inline display.
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const raw = error.response?.data?.errors as Record<string, string[]> | undefined;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, msgs] of Object.entries(raw)) {
    if (Array.isArray(msgs) && msgs.length > 0) out[key] = msgs[0];
  }
  return out;
}

function cleanParams(params?: Record<string, unknown>) {
  if (!params) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<T>>(url, { params: cleanParams(params) });
  return data;
}

export async function apiGetPaginated<T>(url: string, params?: Record<string, unknown>) {
  const { data } = await api.get<PaginatedResponse<T>>(url, { params: cleanParams(params) });
  return data;
}

export async function apiPost<T>(url: string, body?: unknown) {
  const { data } = await api.post<ApiResponse<T>>(url, body);
  return data;
}

export async function apiPut<T>(url: string, body?: unknown) {
  const { data } = await api.put<ApiResponse<T>>(url, body);
  return data;
}

export async function apiDelete<T>(url: string) {
  const { data } = await api.delete<ApiResponse<T>>(url);
  return data;
}
