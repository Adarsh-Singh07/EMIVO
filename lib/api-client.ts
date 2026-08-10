/**
 * ELEKTRIX — Shared API client for the Storefront (root app/).
 * Cookie-based JWT with automatic refresh token rotation.
 * Mirrors the same pattern used in apps/web/src/lib/api-client.ts.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/* ------------------------------------------------------------------ */
/* Minimal cookie helpers (no external dependency needed)              */
/* ------------------------------------------------------------------ */

const Cookies = {
  get: (key: string): string | undefined => {
    if (typeof document === "undefined") return undefined;
    const match = document.cookie.match(new RegExp("(^| )" + key + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : undefined;
  },
  set: (key: string, value: string, days: number) => {
    if (typeof document === "undefined") return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  },
  remove: (key: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  },
};

/* ------------------------------------------------------------------ */
/* Token management                                                    */
/* ------------------------------------------------------------------ */

export const setTokens = (access: string, refresh: string) => {
  Cookies.set("access_token", access, 1);   // 1 day
  Cookies.set("refresh_token", refresh, 7); // 7 days
};

export const removeTokens = () => {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
};

export const getAccessToken = () => Cookies.get("access_token");
export const getRefreshToken = () => Cookies.get("refresh_token");

/* ------------------------------------------------------------------ */
/* Refresh queue (prevent thundering herd on 401)                      */
/* ------------------------------------------------------------------ */

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: Error) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  failedQueue = [];
};

/* ------------------------------------------------------------------ */
/* Core fetch wrapper                                                  */
/* ------------------------------------------------------------------ */

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<T> {
  const token = Cookies.get("access_token");
  const isAuthEndpoint = endpoint.startsWith("/auth/");

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !skipAuth && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  // 401 → attempt token refresh (once per request)
  if (response.status === 401 && !isAuthEndpoint && !skipAuth) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken) => {
            const h = new Headers(options.headers || {});
            h.set("Authorization", `Bearer ${newToken}`);
            fetch(`${API_URL}${endpoint}`, { ...options, headers: h })
              .then((r) => r.json().then(resolve))
              .catch(reject);
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    const refreshToken = Cookies.get("refresh_token");

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data.access_token && data.refresh_token) {
            setTokens(data.access_token, data.refresh_token);
            processQueue(null, data.access_token);

            const retryHeaders = new Headers(options.headers || {});
            retryHeaders.set("Authorization", `Bearer ${data.access_token}`);
            const retryRes = await fetch(`${API_URL}${endpoint}`, {
              ...options,
              headers: retryHeaders,
            });
            if (!retryRes.ok) {
              const err = await retryRes.json().catch(() => ({}));
              throw new Error(err.detail || `Request failed: ${retryRes.status}`);
            }
            return retryRes.json();
          }
        }
      } catch (refreshErr) {
        processQueue(refreshErr as Error, null);
        removeTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }

    isRefreshing = false;
    removeTokens();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json();
}

/* ------------------------------------------------------------------ */
/* Convenience client                                                  */
/* ------------------------------------------------------------------ */

export const apiClient = {
  get: <T = any>(url: string, skipAuth = false) =>
    fetchApi<T>(url, { method: "GET" }, skipAuth),
  post: <T = any>(url: string, data: any, skipAuth = false) =>
    fetchApi<T>(url, { method: "POST", body: JSON.stringify(data) }, skipAuth),
  put: <T = any>(url: string, data: any, skipAuth = false) =>
    fetchApi<T>(url, { method: "PUT", body: JSON.stringify(data) }, skipAuth),
  patch: <T = any>(url: string, data: any, skipAuth = false) =>
    fetchApi<T>(url, { method: "PATCH", body: JSON.stringify(data) }, skipAuth),
  delete: <T = any>(url: string, skipAuth = false) =>
    fetchApi<T>(url, { method: "DELETE" }, skipAuth),
};
