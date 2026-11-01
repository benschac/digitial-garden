import { expect, test } from "bun:test";

import { supportedTrimMode } from "./typography-inspector-measurements";

test("Capsize stays selectable when native CSS trimming is unavailable", () => {
  expect(supportedTrimMode("capsize", false)).toBe("capsize");
  expect(supportedTrimMode("original", false)).toBe("original");
  expect(supportedTrimMode("native", false)).toBe("original");
  expect(supportedTrimMode("capsize", true)).toBe("capsize");
  expect(supportedTrimMode("original", true)).toBe("original");
  expect(supportedTrimMode("native", true)).toBe("native");
});
