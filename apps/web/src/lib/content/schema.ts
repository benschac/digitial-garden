import { Effect, Schema, SchemaGetter } from "effect";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const isRealIsoDate = (value: string): boolean => {
  if (!isoDatePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
};

const isoDateSchema = Schema.String.check(
  Schema.makeFilter(isRealIsoDate, {
    message: "Expected a valid ISO date in YYYY-MM-DD format",
  })
);

const textSchema = Schema.Trim.check(Schema.isMinLength(1));

const urlSchema = Schema.Trim.pipe(
  Schema.decodeTo(Schema.String, {
    decode: SchemaGetter.transform((value) =>
      value.replaceAll(/[\t\n\r]/gu, "")
    ),
    encode: SchemaGetter.passthrough(),
  })
).check(
  Schema.makeFilter((value) => URL.canParse(value), {
    message: "Expected an absolute URL",
  })
);

const metadataSchema = Schema.Struct({
  canonicalUrl: Schema.optional(urlSchema),
  featured: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false))
  ),
  image: Schema.optional(textSchema),
  imageAlt: Schema.optional(textSchema),
  order: Schema.optional(Schema.Finite),
  publishedAt: isoDateSchema,
  series: Schema.optional(textSchema),
  slug: Schema.Trim.check(
    Schema.isPattern(slugPattern, { message: "Expected a URL-safe slug" })
  ),
  status: Schema.Literals(["draft", "published", "archived"]),
  summary: textSchema,
  tags: Schema.mutable(Schema.Array(textSchema)).pipe(
    Schema.withDecodingDefault(Effect.sync(() => []))
  ),
  title: textSchema,
  updatedAt: Schema.optional(isoDateSchema),
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
  }
);

export const postMetadataParseOptions = {
  errors: "all",
  onExcessProperty: "error",
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

export const normalizeTagSlug = (tag: string): string =>
  tag
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");

export const isPublicationEligible = (
  post: Pick<PostMetadata, "publishedAt" | "status">,
  now = new Date()
): boolean => {
  if (post.status !== "published") {
    return false;
  }

  const publicationTime = Date.parse(`${post.publishedAt}T00:00:00.000Z`);

  return publicationTime <= now.valueOf();
};

export const sortPostsNewestFirst = <
  T extends Pick<PostMetadata, "publishedAt" | "slug">,
>(
  posts: readonly T[]
): T[] =>
  posts.toSorted((left, right) => {
    const dateComparison = right.publishedAt.localeCompare(left.publishedAt);

    return dateComparison || left.slug.localeCompare(right.slug);
  });
