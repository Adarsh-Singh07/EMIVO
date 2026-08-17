"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { LoadingStagger } from "@/components/animations/LoadingStagger";

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
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingStagger count={3} />
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
      <div className="flex h-screen w-full items-center justify-center bg-neutral-50 p-6">
        <div className="max-w-md w-full rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
            <ShieldX className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900">No access</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Your account does not have permission to open the admin console. Access requires one of
            the roles: <span className="font-mono text-xs">{(requiredRoles || []).join(", ")}</span>.
          </p>
          <p className="mt-3 text-xs text-neutral-400">
            Signed in roles: <span className="font-mono">{roles.length ? roles.join(", ") : "none"}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
