import { getPublishedPosts } from "@/lib/content";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const posts = await getPublishedPosts();
  const items = posts
    .map((post) => {
      const postUrl = new URL(`/blog/${post.slug}`, siteUrl).toString();
      return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${escapeXml(postUrl)}</link>
  <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
  <description>${escapeXml(post.summary)}</description>
  <pubDate>${new Date(`${post.publishedAt}T00:00:00.000Z`).toUTCString()}</pubDate>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Benjamin Schachter</title>
  <link>${escapeXml(siteUrl.toString())}</link>
  <description>Writing about software, experiments, and interaction design.</description>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
