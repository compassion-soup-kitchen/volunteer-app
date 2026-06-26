import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // In a monorepo, trace the workspace root so the standalone bundle includes
  // hoisted dependencies from the root node_modules. Output lands under
  // apps/web/.next/standalone/apps/web/server.js with a sibling node_modules.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
