import { expect, test } from "bun:test";

import { matchesBlogPost } from "./blog-filter";

const post = {
  summary: "Notes on building playful interfaces.",
  title: "Working with Effects",
};

test("matches a substring in the title", () => {
  expect(matchesBlogPost(post, "with Eff")).toBe(true);
});

test("matches a substring in the summary", () => {
  expect(matchesBlogPost(post, "playful inter")).toBe(true);
});

test("ignores case and surrounding query whitespace", () => {
  expect(matchesBlogPost(post, " \tEFFECTS\n")).toBe(true);
  expect(matchesBlogPost(post, "  BUILDING  ")).toBe(true);
});

test("keeps every post for an empty or whitespace-only query", () => {
  expect(matchesBlogPost(post, "")).toBe(true);
  expect(matchesBlogPost(post, " \t\n")).toBe(true);
});

test("rejects a query absent from both fields", () => {
  expect(matchesBlogPost(post, "databases")).toBe(false);
  expect(matchesBlogPost(post, "Effects Notes")).toBe(false);
});
