import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRealIsoDate(value: string): boolean {
  if (!isoDatePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

const isoDateSchema = z
  .string()
  .refine(isRealIsoDate, "Expected a valid ISO date in YYYY-MM-DD format");

export const postMetadataSchema = z
  .strictObject({
    title: z.string().trim().min(1),
    slug: z.string().trim().regex(slugPattern, "Expected a URL-safe slug"),
    summary: z.string().trim().min(1),
    publishedAt: isoDateSchema,
    status: z.enum(["draft", "published", "archived"]),
    tags: z.array(z.string().trim().min(1)).default([]),
    updatedAt: isoDateSchema.optional(),
    featured: z.boolean().default(false),
    image: z.string().trim().min(1).optional(),
    imageAlt: z.string().trim().min(1).optional(),
    canonicalUrl: z.url().optional(),
    series: z.string().trim().min(1).optional(),
    order: z.number().finite().optional(),
  })
  .check(({ value: metadata, issues }) => {
    if (metadata.image && !metadata.imageAlt) {
      issues.push({
        code: "custom",
        input: metadata,
        message: "imageAlt is required when image is present",
        path: ["imageAlt"],
      });
    }

    if (metadata.order !== undefined && !metadata.series) {
      issues.push({
        code: "custom",
        input: metadata,
        message: "series is required when order is present",
        path: ["series"],
      });
    }
  });

export type PostMetadata = z.infer<typeof postMetadataSchema>;

export interface PostRecord extends PostMetadata {
  extension: ".md" | ".mdx";
  sourceFile: string;
  sourceStem: string;
}

export type PostSummary = Omit<
  PostRecord,
  "extension" | "sourceFile" | "sourceStem"
>;

export function normalizeTagSlug(tag: string): string {
  return tag
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isPublicationEligible(
  post: Pick<PostMetadata, "publishedAt" | "status">,
  now = new Date(),
): boolean {
  if (post.status !== "published") {
    return false;
  }

  const publicationTime = Date.parse(`${post.publishedAt}T00:00:00.000Z`);
  return publicationTime <= now.valueOf();
}

export function sortPostsNewestFirst<
  T extends Pick<PostMetadata, "publishedAt" | "slug">,
>(posts: readonly T[]): T[] {
  return [...posts].sort((left, right) => {
    const dateComparison = right.publishedAt.localeCompare(left.publishedAt);
    return dateComparison || left.slug.localeCompare(right.slug);
  });
}
