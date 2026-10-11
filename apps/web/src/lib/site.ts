const fallbackSiteUrl = "http://localhost:3000";

export function getSiteUrl(): URL {
  const configuredUrl = process.env.SITE_URL ?? fallbackSiteUrl;
  return new URL(configuredUrl);
}
