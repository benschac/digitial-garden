import assert from "node:assert/strict";
import { test } from "node:test";

import { shouldSkipStackCI } from "./stack-ci.mjs";

const repository = { full_name: "benschac/digitial-garden" };

const pull = {
  base: { ref: "main", repo: repository },
  head: { ref: "stack-base", repo: repository },
  number: 1,
  state: "open",
};

const child = {
  base: { ref: "stack-base", repo: repository },
  head: { ref: "stack-top", repo: repository },
  number: 2,
  state: "open",
};

const fixture = (t, pulls = []) => {
  const context = {
    eventName: "pull_request",
    payload: { pull_request: pull },
    repo: { owner: "benschac", repo: "digitial-garden" },
  };

  const github = {
    paginate: t.mock.fn(() => Promise.resolve(pulls)),
    rest: { pulls: { list: Symbol("list pull requests") } },
  };

  const core = { warning: t.mock.fn() };

  return { context, core, github };
};

test("skips a lower PR when an open PR in the same repository targets its branch", async (t) => {
  const { context, core, github } = fixture(t, [child]);
  assert.equal(await shouldSkipStackCI(github, context, core), true);
  assert.deepEqual(github.paginate.mock.calls[0].arguments, [
    github.rest.pulls.list,
    {
      ...context.repo,
      base: "stack-base",
      per_page: 100,
      request: { timeout: 30_000 },
      state: "open",
    },
  ]);
});

test("runs verification for standalone PRs and the top of a stack", async (t) => {
  const { context, core, github } = fixture(t);
  assert.equal(await shouldSkipStackCI(github, context, core), false);
});

test("ignores closed, unrelated, self-referencing and fork PRs", async (t) => {
  const { context, core, github } = fixture(t, [
    { ...child, state: "closed" },
    { ...child, base: { ref: "another-branch", repo: repository } },
    { ...child, number: pull.number },
    { ...child, head: { ...child.head, repo: { full_name: "fork/garden" } } },
    { ...child, base: { ...child.base, repo: { full_name: "fork/garden" } } },
  ]);

  assert.equal(await shouldSkipStackCI(github, context, core), false);
});

for (const contextOverrides of [
  {
    payload: {
      pull_request: {
        ...pull,
        head: { ...pull.head, repo: { full_name: "fork/garden" } },
      },
    },
  },
  { eventName: "push", payload: {} },
  { eventName: "merge_group", payload: {} },
  { eventName: "workflow_dispatch", payload: {} },
]) {
  test(`does not query stacks for ${contextOverrides.eventName ?? "fork PR"} events`, async (t) => {
    const { context, core, github } = fixture(t, [child]);
    assert.equal(
      await shouldSkipStackCI(
        github,
        { ...context, ...contextOverrides },
        core
      ),
      false
    );
    assert.equal(github.paginate.mock.callCount(), 0);
  });
}

test("runs verification and warns when GitHub lookup fails", async (t) => {
  const { context, core, github } = fixture(t);
  github.paginate.mock.mockImplementation(() =>
    Promise.reject(new Error("GitHub unavailable"))
  );
  assert.equal(await shouldSkipStackCI(github, context, core), false);
  assert.equal(core.warning.mock.callCount(), 1);
});
