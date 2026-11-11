import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/email";
import { PUBLIC_PAGES } from "@/lib/public-pages";

// NEXTAUTH_URL only exists at runtime (the Docker build has none), so render
// per request rather than baking localhost into the URLs at build.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  return PUBLIC_PAGES.map((page) => ({
    url: page === "/" ? base : `${base}${page}`,
  }));
}
