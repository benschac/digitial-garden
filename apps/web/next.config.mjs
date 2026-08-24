import createMDX from "@next/mdx";

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
    remarkPlugins: ["remark-frontmatter", "remark-gfm"],
    rehypePlugins: [
      "rehype-slug",
      ["@shikijs/rehype", { theme: "github-dark-dimmed" }],
    ],
  },
});

export default withMDX(nextConfig);
