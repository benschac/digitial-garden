export const siteConfig = {
  url: "https://www.benjaminschachter.com",
} as const;

/** Absolute URL for canonical links, the sitemap, and RSS. Set SITE_URL to override per environment. */
export function getSiteUrl(): URL {
  return new URL(process.env.SITE_URL || siteConfig.url);
}
