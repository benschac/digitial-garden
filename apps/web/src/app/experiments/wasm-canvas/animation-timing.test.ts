import { describe, expect, test } from "bun:test";
import { frameDeltaSeconds, trailAlpha } from "./animation-timing";

describe("frameDeltaSeconds", () => {
  test("uses a 60 fps delta for the first frame", () => {
    expect(frameDeltaSeconds(null, 1_000)).toBeCloseTo(1 / 60);
  });

  test("clamps long gaps to the simulation maximum", () => {
    expect(frameDeltaSeconds(1_000, 2_000)).toBeCloseTo(1 / 24);
  });
});

describe("trailAlpha", () => {
  test("preserves the existing opacity at 60 fps", () => {
    expect(trailAlpha(1 / 60)).toBeCloseTo(0.2);
  });

  test("two 120 fps frames retain the same trail as one 60 fps frame", () => {
    const alpha = trailAlpha(1 / 120);

    expect((1 - alpha) ** 2).toBeCloseTo(0.8);
  });
});
