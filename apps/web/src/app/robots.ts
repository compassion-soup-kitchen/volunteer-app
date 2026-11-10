import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/email";
import { PUBLIC_PAGES } from "@/lib/public-pages";

// NEXTAUTH_URL only exists at runtime (the Docker build has none), so render
// per request rather than baking localhost into the sitemap link at build.
export const dynamic = "force-dynamic";

/**
 * Crawlers may read the public pages and nothing else: everything else needs
 * a sign-in and only redirects to /login. Listed in src/proxy.ts's public
 * paths so it is served rather than redirected.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: PUBLIC_PAGES.map((page) => (page === "/" ? "/$" : page)),
      disallow: "/",
    },
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  };
}
