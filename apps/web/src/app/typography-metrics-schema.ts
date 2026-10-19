import * as Schema from "effect/Schema";

export const typographyMetricsSchema = Schema.Struct({
  metrics: Schema.Struct({
    familyName: Schema.String,
    fullName: Schema.String,
    postscriptName: Schema.String,
    category: Schema.optional(Schema.String),
    ascent: Schema.Finite,
    descent: Schema.Finite,
    lineGap: Schema.Finite,
    unitsPerEm: Schema.Finite.check(Schema.isGreaterThan(0)),
    capHeight: Schema.Finite,
    xHeight: Schema.Finite,
    xWidthAvg: Schema.Finite,
  }),
  source: Schema.NonEmptyString,
});

export const decodeTypographyMetrics = Schema.decodeUnknownSync(
  typographyMetricsSchema,
);
