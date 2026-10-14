import { expect, test } from "bun:test";
import { frameProgress } from "./svg-pattern-motion";

test("a restarted loop advances on its first frame", () => {
  expect(frameProgress(null, 1000)).toBeCloseTo(0.18);
});

test("duplicate or earlier frame timestamps cannot stall or reverse motion", () => {
  for (const current of [1000, 999, 980]) {
    const progress = frameProgress(1000, current);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
    const rotation = 30 + (90 - 30) * progress;
    expect(rotation).toBeGreaterThan(30);
    expect(rotation).toBeLessThan(90);
  }
});

test("a long pause does not jump straight to the target", () => {
  expect(frameProgress(1000, 10000)).toBeLessThan(0.6);
});

test("60 and 120 fps converge by the same amount over equal time", () => {
  const at60 = frameProgress(0, 1000 / 60);
  const at120 = frameProgress(0, 1000 / 120);
  expect((1 - at120) ** 2).toBeCloseTo(1 - at60);
});
