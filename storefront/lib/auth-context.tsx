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

/** Exactly one of email/phone — passwordless one-time-code login. */
interface OtpIdentifier {
  email?: string;
  phone?: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface AuthCtxValue {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  requestOtp: (identifier: OtpIdentifier) => Promise<{ channel: "email" | "sms"; maskedEmail?: string }>;
  verifyOtp: (identifier: OtpIdentifier, code: string) => Promise<void>;
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
      user?: User;
    }>("/auth/login", { email, password }, true);
    setTokens(data.access_token, data.refresh_token);

    // The login response carries the user — sign-in completes in ONE
    // network round-trip. The guest-cart merge is best-effort and runs in
    // the background; it must not delay the user entering the app.
    if (data.user) setUser(data.user);
    else setUser(await apiClient.get<User>("/users/me"));
    (async () => {
      try {
        const sessionId = getCartSessionId();
        if (sessionId) await storeApi.mergeCart(sessionId);
      } catch {
        /* best-effort */
      }
    })();
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

  /** Send a one-time login code to the email or phone. The backend always
   * reports success (202) — errors here are only network/validation issues.
   * Returns the delivery channel and a MASKED rendering of the destination
   * email (phone requests fall back to the account's email when SMS is
   * not configured). */
  const requestOtp = useCallback(
    async ({
      email,
      phone,
    }: OtpIdentifier): Promise<{ channel: "email" | "sms"; maskedEmail?: string }> => {
      const res = await apiClient.post<{
        channel?: "email" | "sms";
        masked_email?: string;
      }>("/auth/otp/request", { email: email ?? null, phone: phone ?? null }, true);
      return {
        channel: res.channel === "sms" ? "sms" : "email",
        maskedEmail: res.masked_email,
      };
    },
    []
  );

  /** Exchange the one-time code for tokens, then finish the same post-login
   * steps as the password flow (guest-cart merge + profile fetch). */
  const verifyOtp = useCallback(async ({ email, phone }: OtpIdentifier, code: string) => {
    const data = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      user?: User;
    }>("/auth/otp/verify", { email: email ?? null, phone: phone ?? null, code }, true);
    setTokens(data.access_token, data.refresh_token);

    if (data.user) setUser(data.user);
    else setUser(await apiClient.get<User>("/users/me"));
    (async () => {
      try {
        const sessionId = getCartSessionId();
        if (sessionId) await storeApi.mergeCart(sessionId);
      } catch {
        /* best-effort */
      }
    })();
  }, []);

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
    <AuthCtx.Provider value={{ user, loading, login, requestOtp, verifyOtp, register, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}
