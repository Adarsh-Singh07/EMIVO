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
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.detail || ('Request failed with status ' + res.status));
          }
          return res.json();
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
              const errorData = await retryResponse.json().catch(() => ({}));
              throw new Error(errorData.detail || ('Request failed with status ' + retryResponse.status));
            }
            return retryResponse.json();
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
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || ('Request failed with status ' + response.status));
  }

  return response.json();
}

export const apiClient = {
  get: <T = any>(url: string, skipAuth = false) => fetchApi<T>(url, { method: 'GET' }, skipAuth),
  post: <T = any>(url: string, data: any, skipAuth = false) => fetchApi<T>(url, { method: 'POST', body: JSON.stringify(data) }, skipAuth),
  put: <T = any>(url: string, data: any, skipAuth = false) => fetchApi<T>(url, { method: 'PUT', body: JSON.stringify(data) }, skipAuth),
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