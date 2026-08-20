export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Provide a mock js-cookie since we can't install packages right now
const Cookies = {
  get: (key: string) => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
      if (match) return match[2];
    }
    return undefined;
  },
  set: (key: string, value: string, options?: { expires?: number }) => {
    if (typeof document !== 'undefined') {
      let cookie = key + '=' + value + '; path=/; SameSite=Lax';
      // Secure flag for production (HTTPS)
      if (window.location.protocol === 'https:') {
        cookie += '; Secure';
      }
      if (options?.expires) {
        const d = new Date();
        d.setTime(d.getTime() + (options.expires * 24 * 60 * 60 * 1000));
        cookie += '; expires=' + d.toUTCString();
      }
      document.cookie = cookie;
    }
  },
  remove: (key: string) => {
    if (typeof document !== 'undefined') {
      document.cookie = key + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }
};

/** Error thrown for non-2xx API responses. Carries the v0.2 error envelope. */
export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  // v0.2 envelope: {error, code, request_id}; fall back to FastAPI {detail} / field errors
  let message =
    (typeof data.error === 'string' && data.error) ||
    (typeof data.detail === 'string' && data.detail) ||
    '';
  if (!message && Array.isArray(data.detail)) {
    message = (data.detail as Array<Record<string, unknown>>)
      .map((d) => {
        const loc = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : '';
        return [loc, typeof d.msg === 'string' ? d.msg : ''].filter(Boolean).join(': ');
      })
      .filter(Boolean)
      .join('; ');
  }
  if (!message) message = `Request failed with status ${response.status}`;
  return new ApiError(
    message,
    response.status,
    typeof data.code === 'string' ? data.code : undefined,
    typeof data.request_id === 'string' ? data.request_id : undefined
  );
}

async function parseBody<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

let isRefreshing = false;
let failedRequestsQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedRequestsQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedRequestsQueue = [];
};

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<T> {
  const token = Cookies.get('access_token');
  const isAuthEndpoint = endpoint.startsWith('/auth/');

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization') && !skipAuth) {
    headers.set('Authorization', 'Bearer ' + token);
  }

  const response = await fetch(API_URL + endpoint, {
    ...options,
    headers,
  });

  // Handle 401 - attempt token refresh
  if (response.status === 401 && !isAuthEndpoint && !skipAuth) {
    const originalRequest = () => fetchApi<T>(endpoint, options, skipAuth);

    if (isRefreshing) {
      // Queue the request
      return new Promise((resolve, reject) => {
        failedRequestsQueue.push({ resolve, reject });
      }).then((newToken) => {
        const newHeaders = new Headers(options.headers || {});
        newHeaders.set('Authorization', 'Bearer ' + newToken);
        return fetch(API_URL + endpoint, { ...options, headers: newHeaders }).then(async res => {
          if (!res.ok) {
            throw await parseError(res);
          }
          return parseBody<T>(res);
        });
      });
    }

    isRefreshing = true;
    const refreshToken = Cookies.get('refresh_token');

    if (refreshToken) {
      try {
        const refreshResponse = await fetch(API_URL + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          if (data.access_token && data.refresh_token) {
            Cookies.set('access_token', data.access_token, { expires: 1 });
            Cookies.set('refresh_token', data.refresh_token, { expires: 7 });
            processQueue(null, data.access_token);

            // Retry original request with new token
            const newHeaders = new Headers(options.headers || {});
            newHeaders.set('Authorization', 'Bearer ' + data.access_token);
            const retryResponse = await fetch(API_URL + endpoint, { ...options, headers: newHeaders });

            if (!retryResponse.ok) {
              throw await parseError(retryResponse);
            }
            return parseBody<T>(retryResponse);
          }
        }
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        // Clear tokens and redirect to login
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    // If we get here, refresh failed
    isRefreshing = false;
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError('Session expired. Please log in again.', 401, 'SESSION_EXPIRED');
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return parseBody<T>(response);
}

export const apiClient = {
  get: <T = any>(url: string, skipAuth = false) => fetchApi<T>(url, { method: 'GET' }, skipAuth),
  post: <T = any>(url: string, data: any, skipAuth = false) => fetchApi<T>(url, { method: 'POST', body: JSON.stringify(data) }, skipAuth),
  put: <T = any>(url: string, data: any, skipAuth = false) => fetchApi<T>(url, { method: 'PUT', body: JSON.stringify(data) }, skipAuth),
  patch: <T = any>(url: string, data: any, skipAuth = false) => fetchApi<T>(url, { method: 'PATCH', body: JSON.stringify(data) }, skipAuth),
  delete: <T = any>(url: string, skipAuth = false) => fetchApi<T>(url, { method: 'DELETE' }, skipAuth),
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  Cookies.set('access_token', accessToken, { expires: 1 });
  Cookies.set('refresh_token', refreshToken, { expires: 7 });
};

export const removeTokens = () => {
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
};

export const getAccessToken = (): string | undefined => {
  return Cookies.get('access_token');
};

export const getRefreshToken = (): string | undefined => {
  return Cookies.get('refresh_token');
};
