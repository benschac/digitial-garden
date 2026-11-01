import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { execa } from "execa";

import {
  createNativeStore,
  importRegistry,
  planImport,
  validateRegistry,
} from "./orchestrator-import.mjs";

const sha = "a".repeat(40);

const contract = (id, overrides = {}) => ({
  acceptance: ["Focused behavior passes"],
  budget: { attempts: 3, checkMs: 600_000, taskMs: 1_800_000 },
  checks: [["node", "--test", `scripts/${id}.test.mjs`]],
  contractApprovals: [],
  gitParents: [],
  hardPrerequisites: [],
  id,
  inputRevisions: [],
  model: { effort: "high", id: "gpt-6.1-sol" },
  ownedPaths: [`scripts/${id}.mjs`],
  reservations: [],
  specificationRevision: sha,
  title: `Task ${id}`,
  ...overrides,
});

const fixture = () => ({
  registry: {
    tasks: [
      contract("P0"),
      contract("D1", {
        contractApprovals: [{ id: "approved-contract", revision: sha }],
        gitParents: [sha],
        hardPrerequisites: ["P0"],
        inputRevisions: [
          { id: "P0", revision: sha },
          { id: "approved-contract", revision: sha },
        ],
        reservations: ["planner-worktree"],
      }),
    ],
  },
  required: {
    edges: [{ from: "D1", to: "P0", type: "blocks" }],
    taskIds: ["P0", "D1"],
  },
});

const memoryStore = (seed = [], seedEdges = []) => {
  const records = structuredClone(seed);
  const edges = structuredClone(seedEdges);
  const writes = [];

  return {
    addEdge: (edge) => {
      assert.ok(records.some((record) => record.id === edge.from));
      assert.ok(records.some((record) => record.id === edge.to));
      edges.push(edge);
      writes.push(["edge", edge]);

      return Promise.resolve();
    },
    adopt: (record, item) => {
      const current = records.find((entry) => entry.id === record.id);
      current.metadata = { ...current.metadata, "orchestrator.contract": item };
      writes.push(["adopt", record.id]);

      return Promise.resolve();
    },
    assertNoCycles: () => Promise.resolve(),
    create: (item) => {
      const record = {
        external_ref: `orchestrator-${item.id}`,
        id: `native-${records.length}`,
        metadata: { "orchestrator.contract": item },
        status: "open",
      };

      writes.push(["create", record.id]);
      records.push(record);

      return Promise.resolve(record);
    },
    edges: (id) => Promise.resolve(edges.filter((edge) => edge.from === id)),
    list: (ref) =>
      Promise.resolve(records.filter((record) => record.external_ref === ref)),
    records,
    writes,
  };
};

test("repeat import preserves closed evidence, claims, attempts and notes without writes", async () => {
  const { registry, required } = fixture();

  const closed = {
    assignee: "original-worker",
    closed_at: "2026-11-01T20:00:00Z",
    external_ref: "orchestrator-P0",
    id: "existing-p0",
    metadata: { evidence: { commit: sha }, "pilot.attempt": 2 },
    notes: "accepted receipt",
    revision: "r1",
    status: "closed",
  };

  const store = memoryStore([closed]);

  const first = await importRegistry(registry, store, required, {
    "orchestrator-P0": { id: closed.id, revision: "r1" },
  });

  const afterFirst = structuredClone(store.records);
  const count = store.writes.length;
  const second = await importRegistry(registry, store, required);
  assert.deepEqual(first.ids, second.ids);
  assert.deepEqual(store.records, afterFirst);
  assert.equal(store.writes.length, count);
  const [{ metadata, ...preserved }] = store.records;
  const { metadata: originalMetadata, ...originalFields } = closed;
  assert.deepEqual(preserved, originalFields);
  assert.equal(metadata["pilot.attempt"], 2);
  assert.deepEqual(metadata.evidence, originalMetadata.evidence);
  assert.equal(store.records.length, 2);
  assert.deepEqual(first.edges, [
    { from: first.ids.D1, to: first.ids.P0, type: "blocks" },
  ]);
});

test("duplicate external IDs and incompatible or unapproved reconciliation fail before writes", async () => {
  const { registry, required } = fixture();

  const existing = {
    external_ref: "orchestrator-P0",
    id: "one",
    revision: "r1",
    status: "closed",
  };

  const duplicate = memoryStore([existing, { ...existing, id: "two" }]);
  await assert.rejects(
    importRegistry(registry, duplicate, required),
    /Duplicate external reference/u
  );
  assert.deepEqual(duplicate.writes, []);
  assert.throws(
    () => planImport(registry, [existing], required),
    /adoption required/u
  );
  assert.throws(
    () =>
      planImport(registry, [existing], required, {
        "orchestrator-P0": { id: "one", revision: "stale" },
      }),
    /adoption required/u
  );

  const incompatible = {
    ...existing,
    metadata: {
      "orchestrator.contract": contract("P0", { ownedPaths: ["other.mjs"] }),
    },
  };

  assert.throws(
    () => planImport(registry, [incompatible], required),
    /Incompatible contract/u
  );
});

test("missing, unknown, duplicated and cyclic graph edges are rejected", () => {
  const { registry, required } = fixture();
  assert.throws(
    () => validateRegistry(registry, { ...required, edges: [] }),
    /Mismatched registry edges/u
  );
  assert.throws(
    () => validateRegistry(registry, { ...required, taskIds: ["P0"] }),
    /Mismatched registry tasks/u
  );
  assert.throws(
    () =>
      validateRegistry(registry, {
        ...required,
        edges: [...required.edges, required.edges[0]],
      }),
    /Duplicate registry edges/u
  );
  const unknown = structuredClone(registry);
  unknown.tasks[1].hardPrerequisites = ["MISSING"];
  unknown.tasks[1].inputRevisions.push({ id: "MISSING", revision: sha });
  assert.throws(
    () => validateRegistry(unknown, required),
    /Unknown or self dependency/u
  );
  const cyclic = structuredClone(registry);
  cyclic.tasks[0].hardPrerequisites = ["D1"];
  cyclic.tasks[0].inputRevisions = [{ id: "D1", revision: sha }];
  assert.throws(
    () =>
      validateRegistry(cyclic, {
        ...required,
        edges: [...required.edges, { from: "P0", to: "D1", type: "blocks" }],
      }),
    /cycle/u
  );
});

test("owned paths reject Git metadata components while allowing ordinary dotfiles", () => {
  const { registry, required } = fixture();

  for (const owned of [
    ".git",
    ".GIT/config",
    "packages/nested/.git/config",
    "packages/nested/.git",
    "packages/nested/.GiT/config",
    "packages/nested/.GIT",
  ]) {
    const invalid = structuredClone(registry);
    invalid.tasks[0].ownedPaths = [owned];
    assert.throws(
      () => validateRegistry(invalid, required),
      /Invalid owned path/u
    );
  }

  for (const owned of [
    ".gitignore",
    "packages/nested/.github/workflows/check.yml",
    "packages/nested/.env.example",
  ]) {
    const valid = structuredClone(registry);
    valid.tasks[0].ownedPaths = [owned];
    assert.doesNotThrow(() => validateRegistry(valid, required));
  }
});

test("every contract requires ownership, checks, pinned inputs, model and bounded budgets", () => {
  const { registry, required } = fixture();

  for (const field of [
    "ownedPaths",
    "acceptance",
    "checks",
    "inputRevisions",
    "budget",
    "model",
    "specificationRevision",
  ]) {
    const invalid = structuredClone(registry);
    invalid.tasks[0] = Object.fromEntries(
      Object.entries(invalid.tasks[0]).filter(([key]) => key !== field)
    );
    assert.throws(() => validateRegistry(invalid, required));
  }

  for (const owned of [
    "../outside",
    "/absolute",
    ".git/config",
    "scripts//one",
    "scripts/./one",
    "windows\\file",
  ]) {
    const invalid = structuredClone(registry);
    invalid.tasks[0].ownedPaths = [owned];
    assert.throws(
      () => validateRegistry(invalid, required),
      /Invalid owned path/u
    );
  }

  for (const mutate of [
    (item) => {
      item.tasks[1].inputRevisions = [];
    },
    (item) => {
      item.tasks[1].contractApprovals[0].revision = "b".repeat(40);
    },
    (item) => {
      item.tasks[0].budget.attempts = 4;
    },
    (item) => {
      item.tasks[0].budget.taskMs = 10;
    },
    (item) => {
      item.tasks[0].model.id = "unknown-model";
    },
    (item) => {
      item.tasks[0].specificationRevision = `${sha}\n`;
    },
    (item) => {
      item.tasks[0].id = "P0\n";
    },
    (item) => {
      item.tasks[0].unexpectedApproval = true;
    },
  ]) {
    const invalid = structuredClone(registry);
    mutate(invalid);
    assert.throws(() => validateRegistry(invalid, required));
  }
});

test("B1 leaves retain exact refs and grouping edges without a parent blocking deadlock", () => {
  const tasks = [
    contract("B1"),
    contract("B1a", { parent: "B1" }),
    contract("B1b", {
      hardPrerequisites: ["B1a"],
      inputRevisions: [{ id: "B1a", revision: sha }],
      parent: "B1",
    }),
  ];

  const required = {
    edges: [
      { from: "B1a", to: "B1", type: "parent-child" },
      { from: "B1b", to: "B1", type: "parent-child" },
      { from: "B1b", to: "B1a", type: "blocks" },
    ],
    taskIds: ["B1", "B1a", "B1b"],
  };

  const records = [
    ["B1", "psbp-ix9"],
    ["B1a", "psbp-yvt"],
    ["B1b", "psbp-ix9.1"],
  ].map(([id, nativeId]) => ({
    external_ref: `orchestrator-${id}`,
    id: nativeId,
    metadata: {
      "orchestrator.contract": validateRegistry({ tasks }, required).tasks.find(
        (item) => item.id === id
      ),
    },
    status: "closed",
  }));

  assert.equal(planImport({ tasks }, records, required).tasks.length, 3);
  assert.throws(
    () => planImport({ tasks }, records.slice(1), required),
    /Restore bootstrap/u
  );
  assert.throws(
    () =>
      planImport(
        { tasks },
        [{ ...records[0], id: "replacement" }, ...records.slice(1)],
        required
      ),
    /Restore bootstrap/u
  );
});

test("unexpected native edges fail before any contract is changed", async () => {
  const { registry, required } = fixture();

  const record = {
    external_ref: "orchestrator-P0",
    id: "p0",
    metadata: { "orchestrator.contract": contract("P0") },
    status: "open",
  };

  const store = memoryStore(
    [record],
    [{ from: "p0", to: "outside", type: "blocks" }]
  );

  await assert.rejects(
    importRegistry(registry, store, required),
    /Unexpected native dependency/u
  );
  assert.deepEqual(store.writes, []);
});

test("closed work rejects a newly unmet prerequisite before writes", async () => {
  const { registry, required } = fixture();

  const store = memoryStore([
    {
      external_ref: "orchestrator-D1",
      id: "closed-d1",
      metadata: {
        "orchestrator.contract": validateRegistry(registry, required).tasks[1],
      },
      status: "closed",
    },
  ]);

  await assert.rejects(
    importRegistry(registry, store, required),
    /would invalidate completed/u
  );
  assert.deepEqual(store.writes, []);
});

test("a silently omitted native edge cannot produce a successful import", async () => {
  const { registry, required } = fixture();
  const store = memoryStore();
  store.addEdge = () => Promise.resolve();
  await assert.rejects(
    importRegistry(registry, store, required),
    /Mismatched native edges/u
  );
});

test("partial edge wiring resumes by stable IDs without duplicate creation", async () => {
  const { registry, required } = fixture();
  const store = memoryStore();
  const original = store.addEdge;
  store.addEdge = () => Promise.reject(new Error("fixture write failure"));
  await assert.rejects(importRegistry(registry, store, required));
  assert.equal(store.records.length, 2);
  store.addEdge = original;
  const result = await importRegistry(registry, store, required);
  assert.equal(store.records.length, 2);
  assert.ok(result.actions.every((item) => item.action === "keep"));
  assert.equal(result.edges.length, 1);
});

test("native adapter requires an explicit target and rejects cancellation before spawning", async () => {
  assert.throws(() => createNativeStore({}), /exactly one/u);
  assert.throws(
    () => createNativeStore({ city: "city", directory: "/tmp/store" }),
    /exactly one/u
  );
  assert.throws(
    () => createNativeStore({ directory: "/tmp/store", timeout: 600_001 }),
    /timeout/u
  );
  const controller = new AbortController();
  controller.abort(new Error("already canceled"));

  const store = createNativeStore({
    directory: "/tmp/no-native-store",
    signal: controller.signal,
  });

  await assert.rejects(store.list("orchestrator-P0"), /already canceled/u);
});

test(
  "native twice-import qualification in a disposable embedded Beads store",
  {
    skip: process.env.ORCHESTRATOR_NATIVE_QUALIFY !== "1",
    timeout: 120_000,
  },
  async (t) => {
    assert.ok(
      process.env.ORCHESTRATOR_NATIVE_SNAPSHOT,
      "Set the explicit bootstrap snapshot path"
    );

    const directory = await mkdtemp(
      path.join(os.tmpdir(), "orchestrator-import-")
    );

    t.after(() => rm(directory, { force: true, recursive: true }));

    const run = (args, input) =>
      execa("bd", args, {
        cancelSignal: t.signal,
        cwd: directory,
        input,
        maxBuffer: 16 * 1024 * 1024,
        timeout: 60_000,
      });

    await run([
      "init",
      "--prefix",
      "psbp",
      "--skip-hooks",
      "--skip-agents",
      "--non-interactive",
    ]);

    const snapshot = JSON.parse(
      await readFile(process.env.ORCHESTRATOR_NATIVE_SNAPSHOT, "utf-8")
    );

    const seeds = snapshot.filter((record) =>
      ["orchestrator-B1", "orchestrator-B1a", "orchestrator-B1b"].includes(
        record.external_ref
      )
    );

    assert.equal(seeds.length, 3);
    assert.ok(seeds.every((record) => record.status === "closed"));
    assert.equal(
      seeds.find((record) => record.external_ref === "orchestrator-B1a")
        .metadata["pilot.published_commit"],
      "8c5d2681d5aeb2432f97020baa9b59bb8d2bd14f"
    );
    await run(
      ["import", "-", "--json"],
      seeds.map((record) => JSON.stringify(record)).join("\n")
    );

    const required = {
      edges: [
        { from: "B1a", to: "B1", type: "parent-child" },
        { from: "B1b", to: "B1", type: "parent-child" },
        { from: "B1b", to: "B1a", type: "blocks" },
      ],
      taskIds: ["B1", "B1a", "B1b", "D1"],
    };

    const registry = {
      tasks: [
        contract("B1"),
        contract("B1a", { parent: "B1" }),
        contract("B1b", {
          hardPrerequisites: ["B1a"],
          inputRevisions: [{ id: "B1a", revision: sha }],
          parent: "B1",
        }),
        contract("D1"),
      ],
    };

    const store = createNativeStore({ directory, signal: t.signal });
    const beforeOutput = await run(["list", "--all", "--limit", "0", "--json"]);
    const before = JSON.parse(beforeOutput.stdout);

    const adoptions = Object.fromEntries(
      await Promise.all(
        seeds.map(async (seed) => {
          const [record] = await store.list(seed.external_ref);

          return [
            record.external_ref,
            { id: record.id, revision: record.revision },
          ];
        })
      )
    );

    const first = await importRegistry(registry, store, required, adoptions);
    const firstOutput = await run(["list", "--all", "--limit", "0", "--json"]);
    const afterFirst = JSON.parse(firstOutput.stdout);
    const second = await importRegistry(registry, store, required);
    const secondOutput = await run(["list", "--all", "--limit", "0", "--json"]);
    const afterSecond = JSON.parse(secondOutput.stdout);
    assert.deepEqual(second.ids, first.ids);
    assert.ok(second.actions.every((item) => item.action === "keep"));
    assert.equal(afterSecond.length, 4);
    assert.deepEqual(afterSecond, afterFirst);

    for (const original of before) {
      const current = afterSecond.find((record) => record.id === original.id);

      for (const key of [
        "status",
        "assignee",
        "notes",
        "closed_at",
        "close_reason",
        "started_at",
        "description",
      ]) {
        assert.deepEqual(current[key], original[key]);
      }

      for (const [key, value] of Object.entries(original.metadata ?? {})) {
        assert.deepEqual(current.metadata[key], value);
      }
    }

    assert.equal(first.ids.B1a, "psbp-yvt");
    assert.equal(first.ids.B1b, "psbp-ix9.1");
    t.diagnostic(
      `Disposable native store ${directory}; preserved three closed bootstrap records; first import 1 create/3 adoptions, second import 0 writes; exact 3 edges verified.`
    );
  }
);
