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
  created_at: string;
  updated_at?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setUser(null);
        return;
      }
      const data = await apiClient.get<User>("/users/me");
      setUser(data);
    } catch (error) {
      setUser(null);
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

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated: !!user,
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