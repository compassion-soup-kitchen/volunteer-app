import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/", "/login", "/register"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth;

  // Allow public paths and auth API
  if (
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/api/auth")
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
    return NextResponse.next();
  }

  // Require auth for all other routes
  if (!isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Staff routes require COORDINATOR or ADMIN role
  if (pathname.startsWith("/staff")) {
    const role = req.auth?.user?.role;
    if (role !== "COORDINATOR" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)",
  ],
};
