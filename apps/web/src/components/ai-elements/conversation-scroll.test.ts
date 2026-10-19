import { describe, expect, test } from "bun:test";

import {
  readScrollPosition,
  restoreScrollPosition,
  saveScrollPosition,
} from "./conversation-scroll";

describe("conversation scroll position", () => {
  test("decodes finite nonnegative positions", () => {
    expect(readScrollPosition('{"atBottom":true,"scrollTop":0}')).toEqual({
      atBottom: true,
      scrollTop: 0,
    });
    expect(readScrollPosition('{"atBottom":false,"scrollTop":320.5}')).toEqual({
      atBottom: false,
      scrollTop: 320.5,
    });
  });

  test("returns undefined for absent and malformed stored data", () => {
    for (const value of [
      null,
      "not-json",
      "null",
      "{}",
      '{"atBottom":true,"scrollTop":-1}',
      '{"atBottom":true,"scrollTop":"12"}',
      '{"atBottom":1,"scrollTop":12}',
      '{"atBottom":false,"scrollTop":1e400}',
    ]) {
      expect(readScrollPosition(value)).toBeUndefined();
    }
  });

  test("returns undefined when session storage access throws", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "sessionStorage",
    );
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("Storage is unavailable");
      },
    });

    try {
      expect(restoreScrollPosition("conversation")).toBeUndefined();
      expect(() =>
        saveScrollPosition("conversation", { atBottom: true, scrollTop: 0 }),
      ).not.toThrow();
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, "sessionStorage", originalDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "sessionStorage");
      }
    }
  });
});
