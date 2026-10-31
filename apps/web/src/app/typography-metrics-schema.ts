import * as Schema from "effect/Schema";

export const typographyMetricsSchema = Schema.Struct({
  metrics: Schema.Struct({
    ascent: Schema.Finite,
    capHeight: Schema.Finite,
    category: Schema.optional(Schema.String),
    descent: Schema.Finite,
    familyName: Schema.String,
    fullName: Schema.String,
    lineGap: Schema.Finite,
    postscriptName: Schema.String,
    unitsPerEm: Schema.Finite.check(Schema.isGreaterThan(0)),
    xHeight: Schema.Finite,
    xWidthAvg: Schema.Finite,
  }),
  source: Schema.NonEmptyString,
});

export const decodeTypographyMetrics = Schema.decodeUnknownSync(
  typographyMetricsSchema
);
