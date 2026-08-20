import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/orders", "/products", "/inventory", "/coupons", "/customers", "/users", "/settings", "/analytics", "/businesses", "/health", "/preview"];
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/health", "/preview", "/robots.txt", "/sitemap.xml", "/_next", "/favicon.ico", "/icons"];

function isProtected(path: string) {
  return PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
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

  // Check for access token cookie
  const accessToken = request.cookies.get("access_token")?.value;

  // If accessing protected route without token, redirect to login
  if (isProtected(pathname) && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and trying to access auth pages, redirect to dashboard
  if ((pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") && accessToken) {
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