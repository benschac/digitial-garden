import { beforeAll, describe, expect, mock, test } from "bun:test";

import { createHighlighter } from "shiki";

import { createCodeHighlighting } from "./code-block-highlighting";

let highlighter: Awaited<ReturnType<typeof createHighlighter>>;

beforeAll(async () => {
  highlighter = await createHighlighter({
    langs: ["typescript", "javascript"],
    themes: ["github-light", "github-dark"],
  });
});

const fixture = () => ({
  getLoadedLanguages: highlighter.getLoadedLanguages.bind(highlighter),
  codeToTokens: mock(highlighter.codeToTokens.bind(highlighter)),
});

describe("chat highlighting", () => {
  test("coalesces initialization and tokenization for concurrent callers", async () => {
    const tokenizer = fixture();
    const gate = Promise.withResolvers<undefined>();
    const initialize = mock(async () => {
      await gate.promise;
      return tokenizer;
    });
    const service = createCodeHighlighting(initialize);
    const first = service.highlight("const value = 1", "typescript");
    const second = service.highlight("const value = 1", "typescript");
    gate.resolve(undefined);
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(tokenizer.codeToTokens).toHaveBeenCalledTimes(1);
    expect(service.getCached("const value = 1", "typescript")).toBe(a);
    await service.highlight("const other = 2", "typescript");
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  test("retries after rejected initialization instead of retaining failure", async () => {
    const tokenizer = fixture();
    let attempts = 0;
    const service = createCodeHighlighting(async () => {
      attempts++;
      if (attempts === 1) throw new Error("load failed");
      return tokenizer;
    });
    expect(await service.highlight("const value = 1", "typescript")).toBeNull();
    expect(service.getCached("const value = 1", "typescript")).toBeNull();
    expect(
      await service.highlight("const value = 1", "typescript"),
    ).not.toBeNull();
    expect(attempts).toBe(2);
  });

  test("uses the entire source and language as the cache key", async () => {
    const tokenizer = fixture();
    const service = createCodeHighlighting(async () => tokenizer);
    const prefix = " ".repeat(100);
    const suffix = " ".repeat(100);
    const a = `${prefix}first${suffix}`;
    const b = `${prefix}other${suffix}`;
    const first = await service.highlight(a, "typescript");
    const other = await service.highlight(b, "typescript");
    const javascript = await service.highlight(a, "javascript");
    expect(
      first?.tokens
        .flat()
        .map((token) => token.content)
        .join(""),
    ).toBe(a);
    expect(
      other?.tokens
        .flat()
        .map((token) => token.content)
        .join(""),
    ).toBe(b);
    expect(other).not.toBe(first);
    expect(javascript).not.toBe(first);
    expect(tokenizer.codeToTokens).toHaveBeenCalledTimes(3);
  });

  test("evicts old token entries at capacity", async () => {
    const tokenizer = fixture();
    const service = createCodeHighlighting(async () => tokenizer, 2);
    await service.highlight("first", "typescript");
    await service.highlight("second", "typescript");
    await service.highlight("third", "typescript");
    expect(service.getCached("first", "typescript")).toBeNull();
    expect(service.getCached("second", "typescript")).not.toBeNull();
    expect(service.getCached("third", "typescript")).not.toBeNull();
    await service.highlight("first", "typescript");
    expect(tokenizer.codeToTokens).toHaveBeenCalledTimes(4);
  });

  test("unsubscribed callers do not receive results or cancel another caller", async () => {
    const tokenizer = fixture();
    const gate = Promise.withResolvers<undefined>();
    const service = createCodeHighlighting(async () => {
      await gate.promise;
      return tokenizer;
    });
    const removed = mock(() => {});
    const received = Promise.withResolvers<undefined>();
    const unsubscribe = service.subscribe("value", "typescript", removed);
    service.subscribe("value", "typescript", () => received.resolve(undefined));
    unsubscribe();
    unsubscribe();
    gate.resolve(undefined);
    await received.promise;
    expect(removed).not.toHaveBeenCalled();
    expect(tokenizer.codeToTokens).toHaveBeenCalledTimes(1);
  });

  test("retains light and dark themes and text fallback for unloaded languages", async () => {
    const tokenizer = fixture();
    const service = createCodeHighlighting(async () => ({
      ...tokenizer,
      getLoadedLanguages: () => [],
    }));
    await service.highlight("plain <code>", "typescript");
    expect(tokenizer.codeToTokens).toHaveBeenCalledWith("plain <code>", {
      lang: "text",
      themes: { dark: "github-dark", light: "github-light" },
    });
  });
});
