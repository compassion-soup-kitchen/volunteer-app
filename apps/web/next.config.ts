import type { NextConfig } from "next";
import path from "node:path";

// The Content-Security-Policy is not here: it carries a fresh nonce on every
// request, so src/proxy.ts builds it (src/lib/content-security-policy.ts),
// including the frame-ancestors rule that lets awhinatech.nz embed the site.
// X-Frame-Options can't express "self + another origin", and CSP
// frame-ancestors supersedes it anyway, so it's deliberately not set.
const securityHeaders = [
  // HSTS is safe to set unconditionally: browsers ignore it over plain HTTP,
  // and production terminates TLS at the Coolify reverse proxy.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Isolate the window from anything it opens or is opened by. Google sign-in
  // on the web is a full-page redirect, not a popup, so nothing relies on
  // window.opener. (Cross-Origin-Embedder-Policy is left off on purpose:
  // require-corp would block Google Maps and Google profile pictures.)
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Nothing outside this origin loads the app's pages or assets (emails carry
  // no images from here; the mobile app is not a browser, so it is unaffected).
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Uploads (policies, training material, pānui attachments) travel as
      // Server Action payloads. Next's default cap is 1 MB, which silently
      // rejected any policy PDF worth uploading long before the 10 MB limit
      // in document-actions.ts got a look in. Keep this comfortably above
      // MAX_UPLOAD_BYTES so the app's own message is what people see.
      bodySizeLimit: "12mb",
    },
  },
  // In a monorepo, trace the workspace root so the standalone bundle includes
  // hoisted dependencies from the root node_modules. Output lands under
  // apps/web/.next/standalone/apps/web/server.js with a sibling node_modules.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
