import type { NextConfig } from "next";
import path from "node:path";

const securityHeaders = [
  // HSTS is safe to set unconditionally: browsers ignore it over plain HTTP,
  // and production terminates TLS at the Coolify reverse proxy.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // In a monorepo, trace the workspace root so the standalone bundle includes
  // hoisted dependencies from the root node_modules. Output lands under
  // apps/web/.next/standalone/apps/web/server.js with a sibling node_modules.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
