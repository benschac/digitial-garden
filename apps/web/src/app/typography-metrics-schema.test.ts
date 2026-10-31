import { describe, expect, test } from "bun:test";

import { decodeTypographyMetrics } from "./typography-metrics-schema";

const validMetrics = {
  metrics: {
    ascent: 800,
    capHeight: 700,
    category: "sans-serif",
    descent: -200,
    familyName: "Example Sans",
    fullName: "Example Sans Regular",
    lineGap: 0,
    postscriptName: "ExampleSans-Regular",
    unitsPerEm: 1000,
    xHeight: 500,
    xWidthAvg: 520,
  },
  source: "public/fonts/example.json",
};

describe("typography metrics schema", () => {
  test("accepts valid finite metrics and positive units per em", () => {
    expect(decodeTypographyMetrics(validMetrics)).toEqual(validMetrics);
  });

  test("rejects zero units per em", () => {
    expect(() =>
      decodeTypographyMetrics({
        ...validMetrics,
        metrics: { ...validMetrics.metrics, unitsPerEm: 0 },
      })
    ).toThrow();
  });

  test.each([
    ["ascent", Number.NaN],
    ["descent", Number.POSITIVE_INFINITY],
    ["lineGap", Number.NEGATIVE_INFINITY],
    ["capHeight", Number.NaN],
    ["xHeight", Number.POSITIVE_INFINITY],
    ["xWidthAvg", Number.NEGATIVE_INFINITY],
  ] as const)("rejects non-finite %s", (field, value) => {
    expect(() =>
      decodeTypographyMetrics({
        ...validMetrics,
        metrics: { ...validMetrics.metrics, [field]: value },
      })
    ).toThrow();
  });
});
