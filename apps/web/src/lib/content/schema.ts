import { Effect, Schema, SchemaGetter } from "effect";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRealIsoDate(value: string): boolean {
  if (!isoDatePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

const isoDateSchema = Schema.String.check(
  Schema.makeFilter(isRealIsoDate, {
    message: "Expected a valid ISO date in YYYY-MM-DD format",
  }),
);
const textSchema = Schema.Trim.check(Schema.isMinLength(1));
const urlSchema = Schema.Trim.pipe(
  Schema.decodeTo(Schema.String, {
    decode: SchemaGetter.transform((value) => value.replace(/[\t\n\r]/g, "")),
    encode: SchemaGetter.passthrough(),
  }),
).check(
  Schema.makeFilter((value) => URL.canParse(value), {
    message: "Expected an absolute URL",
  }),
);

const metadataSchema = Schema.Struct({
  title: textSchema,
  slug: Schema.Trim.check(
    Schema.isPattern(slugPattern, { message: "Expected a URL-safe slug" }),
  ),
  summary: textSchema,
  publishedAt: isoDateSchema,
  status: Schema.Literals(["draft", "published", "archived"]),
  tags: Schema.mutable(Schema.Array(textSchema)).pipe(
    Schema.withDecodingDefault(Effect.sync(() => [])),
  ),
  updatedAt: Schema.optional(isoDateSchema),
  featured: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  image: Schema.optional(textSchema),
  imageAlt: Schema.optional(textSchema),
  canonicalUrl: Schema.optional(urlSchema),
  series: Schema.optional(textSchema),
  order: Schema.optional(Schema.Finite),
});

const metadataChecks = Schema.makeFilter<typeof metadataSchema.Type>(
  (metadata) => {
    const issues: Schema.FilterIssue[] = [];
    if (metadata.image && !metadata.imageAlt) {
      issues.push({
        issue: "imageAlt is required when image is present",
        path: ["imageAlt"],
      });
    }

    if (metadata.order !== undefined && !metadata.series) {
      issues.push({
        issue: "series is required when order is present",
        path: ["series"],
      });
    }
    return issues;
  },
);

export const postMetadataParseOptions = {
  onExcessProperty: "error",
  errors: "all",
} as const;

export const postMetadataSchema = metadataSchema.check(metadataChecks);

export const postDocumentSchema = Schema.Struct({
  ...metadataSchema.fields,
  content: Schema.String,
}).check(metadataChecks);

export type PostMetadata = typeof postMetadataSchema.Type;

export interface PostRecord extends PostMetadata {
  mdx: string;
  sourceFile: string;
}

export type PostSummary = PostMetadata;

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
