import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";
import {
  buildContentSecurityPolicy,
  createNonce,
} from "@/lib/content-security-policy";

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

/**
 * Carry on to the route with a per-request CSP. Next.js reads the nonce out of
 * the request's CSP header and stamps it on its own scripts; the root layout
 * reads `x-nonce` for the one script it renders itself (next-themes).
 */
function nextWithCsp(req: NextRequest) {
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === "development",
  });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const proxy = auth((req) => {
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)",
  ],
};
