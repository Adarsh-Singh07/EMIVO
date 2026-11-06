export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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

const TOKEN_KEY = 'seller_access_token';

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY) || document.cookie.match(new RegExp('(^| )' + TOKEN_KEY + '=([^;]+)'))?.[2] || null;
  },
  setToken: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; SameSite=Lax${secure}`;
  },
  clearToken: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('seller_info');
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
  },
  getSeller: () => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem('seller_info');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setSeller: (seller: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('seller_info', JSON.stringify(seller));
  }
};

async function parseError(response: Response): Promise<ApiError> {
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  let message =
    (typeof data.error === 'string' && data.error) ||
    (typeof data.detail === 'string' && data.detail) ||
    (typeof data.message === 'string' && data.message) ||
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
  if (!message) {
    message = `Request failed with status ${response.status}`;
  }
  const code = typeof data.code === 'string' ? data.code : undefined;
  const reqId = response.headers.get('x-request-id') || undefined;
  return new ApiError(message, response.status, code, reqId);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = authStorage.getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && typeof window !== 'undefined' && !path.includes('/seller/auth/')) {
    authStorage.clearToken();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, data?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'DELETE' }),
};
