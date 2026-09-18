import createMDX from "@next/mdx";
import { withEve } from "eve/next";

/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "a.media-amazon.com", protocol: "https" },
      { hostname: "i0.wp.com", protocol: "https" },
      { hostname: "img.youtube.com", protocol: "https" },
      { hostname: "miro.medium.com", protocol: "https" },
      { hostname: "upload.wikimedia.org", protocol: "https" },
    ],
  },
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: ["remark-frontmatter", "remark-gfm", "remark-math"],
    rehypePlugins: [
      "rehype-slug",
      "rehype-katex",
      ["@shikijs/rehype", { theme: "github-dark-dimmed" }],
    ],
  },
});

export default withEve(withMDX(nextConfig));
