import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { PromptInput } from "./prompt-input";
import { Question } from "./question";

test("protects new-tab prompt submissions while preserving relationship tokens", () => {
  const html = renderToStaticMarkup(
    <PromptInput
      action="https://example.com"
      target="_blank"
      rel="nofollow"
      onSubmit={() => ({ status: "accepted" })}
    />
  );

  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer nofollow"');
});

test("protects new-tab question submissions while preserving relationship tokens", () => {
  const html = renderToStaticMarkup(
    <Question action="https://example.com" target="_blank" rel="nofollow" />
  );

  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer nofollow"');
});
