const fallbackSiteUrl = "http://localhost:3000";

export const getSiteUrl = (): URL => {
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

  const configuredUrl =
    process.env.SITE_URL ??
    (vercelHost ? `https://${vercelHost}` : fallbackSiteUrl);

  return new URL(configuredUrl);
};
