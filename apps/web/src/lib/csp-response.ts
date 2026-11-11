import { NextResponse, type NextRequest } from "next/server";
import {
  buildContentSecurityPolicy,
  createNonce,
} from "@/lib/content-security-policy";

/**
 * Carry on to the route with a per-request CSP. Next.js reads the nonce out of
 * the request's CSP header and stamps it on its own scripts; the root layout
 * reads `x-nonce` for the one script it renders itself (next-themes). The same
 * policy goes on the response, which is what the browser enforces.
 */
export function nextWithCsp(req: NextRequest) {
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
