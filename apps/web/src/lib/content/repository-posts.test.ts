import { afterEach, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import path from "node:path";

import { Effect } from "effect";

import { loadPostRegistry } from "./post-registry-fixture";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Effect.runPromise(
    Effect.forEach(
      temporaryDirectories.splice(0),
      (directory) =>
        Effect.promise(async () => {
          await rm(directory, { force: true, recursive: true });
        }),
      { concurrency: "unbounded", discard: true }
    )
  );
});

test("validates the repository posts", async () => {
  await Effect.runPromise(
    Effect.gen(function* validateRepositoryPosts() {
      const posts = yield* Effect.promise(
        async () =>
          await loadPostRegistry(
            {
              contentDirectory: path.join(process.cwd(), "content", "posts"),
              publicDirectory: path.join(process.cwd(), "public"),
            },
            temporaryDirectories
          )
      );

      expect(posts.length).toBeGreaterThan(0);
    })
  );
}, 15_000);
