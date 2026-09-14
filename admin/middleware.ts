import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/orders", "/products", "/inventory", "/coupons", "/bank-offers", "/abandoned-carts", "/broadcasts", "/customers", "/users", "/settings", "/analytics", "/businesses", "/health", "/preview"];
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/health", "/robots.txt", "/sitemap.xml", "/_next", "/favicon.ico", "/icons"];

// Roles allowed to see ANY admin page — must mirror apps/api RoleType +
// core.dependencies.STAFF_ROLES (platform_admin, owner, staff). The backend
// remains the real enforcement point (require_staff on every route); this
// check stops non-staff users from loading admin UI internals and fails fast.
const STAFF_ROLES = ["platform_admin", "owner", "staff"];

function isProtected(path: string) {
  return PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

/**
 * Decode a JWT payload WITHOUT signature verification (edge runtime has no
 * crypto secret available). This is defence-in-depth only: it checks expiry
 * and role claims so non-staff users don't even get the admin UI served.
 * Token integrity is verified by the API on every request.
 */
function decodeJwtPayload(token: string): { exp?: number; roles?: string[] } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const bin = atob(base64 + pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, API routes (handled by backend), and public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    isPublic(pathname)
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const claims = accessToken ? decodeJwtPayload(accessToken) : null;
  const isValidShape = Boolean(claims && claims.roles && Array.isArray(claims.roles));

  // Expired or malformed token → force re-login
  if (accessToken && (!claims || (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }

  // Protected routes require a token AND a staff role claim
  if (isProtected(pathname)) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (isValidShape && !claims!.roles!.some((r) => STAFF_ROLES.includes(r))) {
      // Authenticated but not staff — never serve admin UI to customers
      return NextResponse.redirect(new URL("/login?error=forbidden", request.url));
    }
  }

  // If logged in and trying to access auth pages, redirect to dashboard
  if ((pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") && accessToken && claims && (!claims.exp || claims.exp * 1000 > Date.now())) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|public).*)",
  ],
};
