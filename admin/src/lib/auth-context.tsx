"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiClient, fetchApi, setTokens, removeTokens } from "@/lib/api-client";
import { toast } from "sonner";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_email_verified?: boolean;
  mfa_enabled?: boolean;
  roles?: string[];
  created_at: string;
  updated_at?: string;
}

/** Staff roles recognized by the v0.2 admin API (backend enforces 403 otherwise). */
export const ADMIN_ROLES = ["owner", "staff", "platform_admin"] as const;

/** Decode the `roles` claim from the JWT access token (base64url payload). */
export function getRolesFromToken(): string[] {
  const token = getAccessToken();
  if (!token) return [];
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return [];
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(json) as { roles?: unknown };
    if (Array.isArray(payload.roles)) return payload.roles.filter((r): r is string => typeof r === "string");
    return [];
  } catch {
    return [];
  }
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Roles from the current access token JWT (e.g. owner/staff/platform_admin/customer). */
  roles: string[];
  /** True when the user holds any admin role (owner/staff/platform_admin). */
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  forgotPassword: (data: { phone?: string; email?: string }) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  loadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokensState] = useState<AuthTokens | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setUser(null);
        setRoles([]);
        return;
      }
      setRoles(getRolesFromToken());
      const data = await apiClient.get<User>("/users/me");
      setUser(data);
    } catch (error) {
      setUser(null);
      setRoles([]);
    }
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetchApi<AuthTokens>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.access_token && response.refresh_token) {
        setTokens(response.access_token, response.refresh_token);
        setTokensState(response);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const response = await fetchApi<AuthTokens>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if (response.access_token && response.refresh_token) {
        setTokens(response.access_token, response.refresh_token);
        setTokensState(response);
        await loadUser();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      toast.error(message);
      throw error;
    }
  };


  const register = async (data: RegisterData): Promise<void> => {
    try {
      await fetchApi<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });

      // After registration, auto-login
      await login({ email: data.email, password: data.password });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed";
      toast.error(message);
      throw error;
    }
  };

  const forgotPassword = async (data: { phone?: string; email?: string }): Promise<void> => {
    toast.success("Password reset instructions sent if account exists");
  };

  const logout = () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      fetchApi("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    removeTokens();
    setTokensState(null);
    setUser(null);
    setRoles([]);
    router.push("/login");
    toast.success("Logged out successfully");
  };

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (accessToken && refreshToken) {
        setTokensState({ access_token: accessToken, refresh_token: refreshToken });
        await loadUser();
      }
      setIsLoading(false);
    };
    initAuth();
  }, [loadUser]);

  const isAdmin = roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r));

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated: !!user,
    roles,
    isAdmin,
    login,
    register,
    forgotPassword,
    logout,
    refreshAccessToken,
    loadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getAccessToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp("(^| )access_token=([^;]+)"));
  return match ? match[2] : undefined;
}

export function getRefreshToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp("(^| )refresh_token=([^;]+)"));
  return match ? match[2] : undefined;
}