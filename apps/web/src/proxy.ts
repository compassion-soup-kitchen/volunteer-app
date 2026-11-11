import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { nextWithCsp } from "@/lib/csp-response";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/privacy",
  "/support",
  "/copyright",
  "/styleguide",
  "/styleguide/emails",
  "/robots.txt",
  "/sitemap.xml",
];

// The auth config is built per request (see `lib/auth.ts`), and in that mode
// Auth.js hands back the wrapped middleware as a *promise* of it - so it is
// awaited inside `proxy` below rather than exported directly. Next requires
// the export to be a function.
const authorised = auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth?.user;

  // Allow public paths, auth API, health checks, and the mobile API
  // (/api/v1 routes enforce their own bearer-token auth)
  if (
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/v1")
  ) {
    // Redirect authenticated users away from login/register
    if (isAuth && (pathname === "/login" || pathname === "/register")) {
      const role = req.auth?.user?.role;
      const destination =
        role === "COORDINATOR" || role === "ADMIN"
          ? "/staff/dashboard"
          : "/dashboard";
      return NextResponse.redirect(new URL(destination, req.url));
    }
    return nextWithCsp(req);
  }

  // Require auth for all other routes
  if (!isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Which area a signed-in person may use is decided by the layout gates,
  // from the role in the database. The token's role is a snapshot from
  // sign-in, so gating /staff on it here would disagree with them whenever
  // someone's role changed mid-session - and the two redirecting at each
  // other loops.

  return nextWithCsp(req);
});

export async function proxy(...args: Parameters<Awaited<typeof authorised>>) {
  return (await authorised)(...args);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)",
  ],
};
