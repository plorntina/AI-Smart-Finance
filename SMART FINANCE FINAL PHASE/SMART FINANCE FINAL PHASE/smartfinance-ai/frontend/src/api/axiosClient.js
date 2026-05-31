// frontend/src/api/axiosClient.js  —  FULL REPLACEMENT (Phase 16)
// ─────────────────────────────────────────────────────────────────────────────
// Change from P14: after a successful /auth/refresh call the interceptor now
// also reads `data.refreshToken` (the rotated token) and saves it to
// localStorage, keeping the client in sync with the server's stored hash.
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

// ─── Storage keys ─────────────────────────────────────────────────────────────
export const ACCESS_TOKEN_KEY  = "sf_token";
export const REFRESH_TOKEN_KEY = "sf_refresh_token";

// ─── Axios instance ───────────────────────────────────────────────────────────
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1",
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor — attach access token ────────────────────────────────
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Refresh-in-progress guard ────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else       prom.resolve(token);
  });
  failedQueue = [];
}

// ─── Response interceptor — silent refresh on 401 ────────────────────────────
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      // Queue concurrent 401s while a refresh is already in flight
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!storedRefreshToken) {
        isRefreshing = false;
        processQueue(error, null);
        forceLogout();
        return Promise.reject(error);
      }

      try {
        const baseURL =
          import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1";

        // Use plain fetch to avoid triggering this same interceptor
        const resp = await fetch(`${baseURL}/auth/refresh`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        if (!resp.ok) {
          throw new Error("Refresh failed");
        }

        const json = await resp.json();

        // Support both { data: { accessToken, refreshToken } } and flat shapes
        const newAccessToken  = json?.data?.accessToken  ?? json?.accessToken  ?? null;
        const newRefreshToken = json?.data?.refreshToken ?? json?.refreshToken ?? null;

        if (!newAccessToken) {
          throw new Error("No access token in refresh response");
        }

        // ── Phase 16: persist BOTH tokens ────────────────────────────────────
        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        if (newRefreshToken) {
          // Overwrite the old (now-invalidated) refresh token with the rotated one
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        }

        // Update default header for future axiosClient requests
        axiosClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        // Resolve all queued requests with the new access token
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Force logout helper ──────────────────────────────────────────────────────
function forceLogout() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  delete axiosClient.defaults.headers.common.Authorization;

  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}

export default axiosClient;
