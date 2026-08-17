"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apiClient, setTokens, removeTokens, getAccessToken, getRefreshToken } from "./api-client";
import { getCartSessionId, storeApi } from "./store-api";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "customer" | "staff" | "owner" | "platform_admin";
  is_active: boolean;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface AuthCtxValue {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

const AuthCtx = createContext<AuthCtxValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiClient.get<User>("/users/me");
      setUser(me);
    } catch {
      // Token is stale or invalid; clear silently
      removeTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    const data = await apiClient.post<{
      access_token: string;
      refresh_token: string;
    }>("/auth/login", { email, password }, true);
    setTokens(data.access_token, data.refresh_token);

    // Best-effort: merge any guest (session) cart into the account right after
    // login. Failure is non-fatal — the user's cart simply stays as-is.
    try {
      const sessionId = getCartSessionId();
      if (sessionId) await storeApi.mergeCart(sessionId);
    } catch {
      /* best-effort */
    }

    // Fetch user profile after login
    const me = await apiClient.get<User>("/users/me");
    setUser(me);
  }, []);

  const register = useCallback(
    async ({ email, password, first_name, last_name }: RegisterPayload) => {
      // Backend /auth/register returns UserResponse (not tokens).
      // We auto-login immediately after successful registration.
      await apiClient.post("/auth/register", { email, password, first_name, last_name }, true);
      // Now login to get tokens
      const tokenData = await apiClient.post<{
        access_token: string;
        refresh_token: string;
      }>("/auth/login", { email, password }, true);
      setTokens(tokenData.access_token, tokenData.refresh_token);

      // Best-effort guest-cart merge (same as login).
      try {
        const sessionId = getCartSessionId();
        if (sessionId) await storeApi.mergeCart(sessionId);
      } catch {
        /* best-effort */
      }

      const me = await apiClient.get<User>("/users/me");
      setUser(me);
    },
    []
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch {
      // Swallow; always clear local state
    } finally {
      removeTokens();
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}
