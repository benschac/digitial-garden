import { afterEach, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import path from "node:path";

import { loadPostRegistry } from "./post-registry-fixture";

const temporaryDirectories: string[] = [];

afterEach(() =>
  Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  )
);

test("validates the repository posts", async () => {
  const posts = await loadPostRegistry(
    {
      contentDirectory: path.join(process.cwd(), "content", "posts"),
      publicDirectory: path.join(process.cwd(), "public"),
    },
    temporaryDirectories
  );

  expect(posts.length).toBeGreaterThan(0);
}, 15_000);
