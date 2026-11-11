/**
 * The public pages worth a search engine's time: what robots.txt allows and
 * sitemap.xml lists. A subset of the proxy's public paths - the token-redeeming
 * pages (reset-password, verify-email) and the styleguide are public but not
 * for indexing.
 */
export const PUBLIC_PAGES = [
  "/",
  "/register",
  "/login",
  "/privacy",
  "/support",
  "/copyright",
] as const;
