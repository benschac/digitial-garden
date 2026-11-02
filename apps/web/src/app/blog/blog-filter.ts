import type { PostSummary } from "@/lib/content/schema";

export const matchesBlogPost = (
  post: Pick<PostSummary, "title" | "summary">,
  query: string
): boolean => {
  const normalizedQuery = query.trim().toLowerCase();

  return (
    post.title.toLowerCase().includes(normalizedQuery) ||
    post.summary.toLowerCase().includes(normalizedQuery)
  );
};
