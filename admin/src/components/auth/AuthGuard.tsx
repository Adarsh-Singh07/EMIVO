"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  /** When set, the user must hold at least one of these roles (from the JWT). */
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, requireAuth = true, requiredRoles, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading, roles } = useAuth();
  const router = useRouter();

  const hasRole = !requiredRoles || roles.some((r) => requiredRoles.includes(r));

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        router.push("/login");
      } else if (!requireAuth && isAuthenticated) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return fallback || null;
  }

  if (!requireAuth && isAuthenticated) {
    return fallback || null;
  }

  if (!hasRole) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6">
        <div className="max-w-md w-full rounded-md border border-neutral-200 bg-white p-6">
          <h1 className="text-base font-semibold text-neutral-900">No access</h1>
          <p className="mt-2 text-sm text-neutral-600">
            This account does not have permission to open the admin console. It needs one of the
            roles: <span className="font-mono text-xs">{(requiredRoles || []).join(", ")}</span>.
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            Roles on this account:{" "}
            <span className="font-mono text-xs">{roles.length ? roles.join(", ") : "none"}</span>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
