import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { Effect, Schema } from "effect";
import { execa } from "execa";

const text = Schema.String.check(Schema.isPattern(/\S/u));

const revision = Schema.String.check(
  Schema.isBetweenLength(40, 40),
  Schema.isPattern(/^[a-f\d]{40}$/u)
);

const taskId = Schema.String.check(
  Schema.isPattern(/^[A-Z][A-Za-z\d-]*(?![\s\S])/u)
);

const artifact = Schema.Struct({ id: text, revision });

const contractSchema = Schema.Struct({
  acceptance: Schema.NonEmptyArray(text),
  budget: Schema.Struct({
    attempts: Schema.Literals([1, 2, 3]),
    checkMs: Schema.Int.check(
      Schema.isBetween({ maximum: 600_000, minimum: 1 })
    ),
    taskMs: Schema.Int.check(
      Schema.isBetween({ maximum: 1_800_000, minimum: 1 })
    ),
  }),
  checks: Schema.NonEmptyArray(Schema.NonEmptyArray(text)),
  contractApprovals: Schema.Array(artifact),
  gitParents: Schema.Array(revision),
  hardPrerequisites: Schema.Array(taskId),
  id: taskId,
  inputRevisions: Schema.Array(artifact),
  model: Schema.Struct({
    effort: Schema.Literals(["medium", "high"]),
    id: Schema.Literals(["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"]),
  }),
  ownedPaths: Schema.NonEmptyArray(text),
  parent: Schema.optionalKey(taskId),
  reservations: Schema.Array(text),
  specificationRevision: revision,
  title: text,
});

const edgeSchema = Schema.Struct({
  from: taskId,
  to: taskId,
  type: Schema.Literals(["blocks", "parent-child"]),
});

const registrySchema = Schema.Struct({
  tasks: Schema.NonEmptyArray(contractSchema),
});

const requirementsSchema = Schema.Struct({
  edges: Schema.Array(edgeSchema),
  taskIds: Schema.NonEmptyArray(taskId),
});

const recordSchema = Schema.Struct({
  external_ref: text,
  id: text,
  metadata: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  revision: Schema.optionalKey(text),
  status: text,
});

const preservedIds = new Map([
  ["B1", "psbp-ix9"],
  ["B1a", "psbp-yvt"],
  ["B1b", "psbp-ix9.1"],
]);

const contractKey = "orchestrator.contract";
const externalRef = (id) => `orchestrator-${id}`;
const edgeKey = ({ from, to, type }) => `${from}:${type}:${to}`;

const unique = (values, label) => {
  if (new Set(values).size !== values.length) {
    throw new Error(`Duplicate ${label}`);
  }
};

const assertSet = (actual, expected, label) => {
  unique(actual, label);
  unique(expected, label);

  if (!isDeepStrictEqual(actual.toSorted(), expected.toSorted())) {
    throw new Error(`Mismatched ${label}`);
  }
};

const assertAcyclic = (ids, edges) => {
  const visiting = new Set();
  const visited = new Set();

  const visit = (id) => {
    if (visiting.has(id)) {
      throw new Error(`Dependency cycle at ${id}`);
    }

    if (visited.has(id)) {
      return;
    }

    visiting.add(id);

    for (const edge of edges.filter((item) => item.from === id)) {
      visit(edge.to);
    }

    visiting.delete(id);
    visited.add(id);
  };

  for (const id of ids) {
    visit(id);
  }
};

const validateOwnedPaths = (task) => {
  unique(task.ownedPaths, `${task.id} paths`);

  for (const owned of task.ownedPaths) {
    if (
      path.posix.isAbsolute(owned) ||
      path.win32.isAbsolute(owned) ||
      owned.includes("\\") ||
      owned.includes("\0") ||
      owned
        .split("/")
        .some(
          (part) =>
            part === "." ||
            part === ".." ||
            part === "" ||
            part.toLowerCase() === ".git"
        )
    ) {
      throw new Error(`Invalid owned path for ${task.id}`);
    }
  }
};

export const validateRegistry = (input, trustedRequirements) => {
  const { tasks } = Schema.decodeUnknownSync(registrySchema, {
    onExcessProperty: "error",
  })(input);

  const required = Schema.decodeUnknownSync(requirementsSchema, {
    onExcessProperty: "error",
  })(trustedRequirements);

  const ids = tasks.map((task) => task.id);
  assertSet(ids, required.taskIds, "registry tasks");
  const edges = [];

  for (const task of tasks) {
    validateOwnedPaths(task);
    unique(task.hardPrerequisites, `${task.id} prerequisites`);
    unique(
      task.contractApprovals.map((item) => item.id),
      `${task.id} approvals`
    );
    unique(
      task.inputRevisions.map((item) => item.id),
      `${task.id} inputs`
    );

    if (task.budget.checkMs > task.budget.taskMs) {
      throw new Error(`Check budget exceeds task budget for ${task.id}`);
    }

    for (const prerequisite of task.hardPrerequisites) {
      if (!task.inputRevisions.some((item) => item.id === prerequisite)) {
        throw new Error(
          `Missing input revision for ${task.id}:${prerequisite}`
        );
      }

      edges.push({ from: task.id, to: prerequisite, type: "blocks" });
    }

    for (const approval of task.contractApprovals) {
      if (
        !task.inputRevisions.some(
          (item) =>
            item.id === approval.id && item.revision === approval.revision
        )
      ) {
        throw new Error(
          `Missing approval revision for ${task.id}:${approval.id}`
        );
      }
    }

    if (task.parent) {
      edges.push({ from: task.id, to: task.parent, type: "parent-child" });
    }
  }

  for (const edge of [...edges, ...required.edges]) {
    if (
      !ids.includes(edge.from) ||
      !ids.includes(edge.to) ||
      edge.from === edge.to
    ) {
      throw new Error(`Unknown or self dependency ${edgeKey(edge)}`);
    }
  }

  assertSet(edges.map(edgeKey), required.edges.map(edgeKey), "registry edges");
  assertAcyclic(
    ids,
    edges.filter((edge) => edge.type === "blocks")
  );
  assertAcyclic(
    ids,
    edges.filter((edge) => edge.type === "parent-child")
  );

  const parents = new Map(tasks.map((task) => [task.id, task.parent]));

  for (const edge of edges.filter((item) => item.type === "blocks")) {
    const ancestors = new Set();
    let parent = parents.get(edge.from);

    while (parent) {
      ancestors.add(parent);
      parent = parents.get(parent);
    }

    if (ancestors.has(edge.to)) {
      throw new Error(
        `Task ${edge.from} cannot block on grouping ancestor ${edge.to}`
      );
    }
  }

  return { edges, tasks };
};

export const planImport = (
  input,
  records,
  trustedRequirements,
  adoptions = {}
) => {
  const registry = validateRegistry(input, trustedRequirements);

  const existing = Schema.decodeUnknownSync(Schema.Array(recordSchema))(
    records
  );

  unique(
    existing.map((record) => record.id),
    "native IDs"
  );

  const tasks = registry.tasks.map((contract) => {
    const matches = existing.filter(
      (record) => record.external_ref === externalRef(contract.id)
    );

    if (matches.length > 1) {
      throw new Error(
        `Duplicate external reference ${externalRef(contract.id)}`
      );
    }

    const [record] = matches;
    const preservedId = preservedIds.get(contract.id);

    if (preservedId && record?.id !== preservedId) {
      throw new Error(
        `Restore bootstrap ${externalRef(contract.id)} as ${preservedId} first`
      );
    }

    if (!record) {
      return { action: "create", contract };
    }

    const previous = record.metadata?.[contractKey];

    if (previous !== undefined) {
      if (!isDeepStrictEqual(previous, contract)) {
        throw new Error(`Incompatible contract for ${contract.id}`);
      }

      return { action: "keep", contract, record };
    }

    const approval = adoptions[externalRef(contract.id)];

    if (
      !approval ||
      approval.id !== record.id ||
      !record.revision ||
      approval.revision !== record.revision
    ) {
      throw new Error(`Revision-bound adoption required for ${contract.id}`);
    }

    return { action: "adopt", contract, record };
  });

  return { edges: registry.edges, tasks };
};

const nativeEdgeSchema = Schema.Array(
  Schema.Struct({ dependency_type: text, id: text })
);

export const createNativeStore = ({
  city,
  directory,
  signal,
  timeout = 60_000,
}) => {
  if (Boolean(city) === Boolean(directory)) {
    throw new Error("Choose exactly one explicit city or disposable directory");
  }

  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 600_000) {
    throw new Error("Native command timeout must be 1..600000 milliseconds");
  }

  const command = city ? "gc" : "bd";
  const prefix = city ? ["--city", city, "bd"] : ["-C", directory];

  const run = async (args) => {
    signal?.throwIfAborted();

    const { stdout } = await execa(command, [...prefix, ...args, "--json"], {
      cancelSignal: signal,
      forceKillAfterDelay: 1000,
      maxBuffer: 16 * 1024 * 1024,
      stdin: "ignore",
      timeout,
    });

    signal?.throwIfAborted();

    return JSON.parse(stdout);
  };

  const read = async (id) => {
    const result = Schema.decodeUnknownSync(Schema.NonEmptyArray(recordSchema))(
      await run(["show", id])
    );

    if (result.length !== 1 || result[0].id !== id) {
      throw new Error(`Unexpected native identity for ${id}`);
    }

    return result[0];
  };

  return {
    addEdge({ from, to, type }) {
      return run(["dep", "add", from, to, "--type", type]);
    },
    adopt(record, contract) {
      return run([
        "update",
        record.id,
        "--metadata",
        JSON.stringify({ [contractKey]: contract }),
      ]);
    },
    async assertNoCycles() {
      const result = Schema.decodeUnknownSync(Schema.Array(Schema.Unknown))(
        await run(["dep", "cycles"])
      );

      if (result.length > 0) {
        throw new Error("Native dependency cycles exist");
      }
    },
    async create(contract) {
      const result = Schema.decodeUnknownSync(recordSchema)(
        await run([
          "create",
          "--title",
          contract.title,
          "--description",
          JSON.stringify(contract),
          "--external-ref",
          externalRef(contract.id),
          "--metadata",
          JSON.stringify({ [contractKey]: contract }),
        ])
      );

      if (result.external_ref !== externalRef(contract.id)) {
        throw new Error(`Unexpected created reference for ${contract.id}`);
      }

      return result;
    },
    async edges(id) {
      const result = Schema.decodeUnknownSync(nativeEdgeSchema)(
        await run(["dep", "list", id])
      );

      return result.map((edge) => ({
        from: id,
        to: edge.id,
        type: edge.dependency_type,
      }));
    },
    async list(ref) {
      const result = Schema.decodeUnknownSync(Schema.Array(recordSchema))(
        await run([
          "list",
          "--all",
          "--limit",
          "0",
          "--max-rows",
          "2",
          "--external-ref",
          ref,
        ])
      );

      if (result.some((record) => record.external_ref !== ref)) {
        throw new Error(
          `Native query returned an unrelated reference for ${ref}`
        );
      }

      return Promise.all(result.map((record) => read(record.id)));
    },
  };
};

const resolveEdges = (edges, ids) =>
  edges.map((edge) => ({
    ...edge,
    from: ids.get(edge.from),
    to: ids.get(edge.to),
  }));

const readEdges = (store, ids) =>
  Effect.forEach(
    [...ids.values()],
    (id) => Effect.tryPromise(() => store.edges(id)),
    { concurrency: 1 }
  ).pipe(Effect.map((edges) => edges.flat()));

export const importRegistry = (
  registry,
  store,
  trustedRequirements,
  adoptions = {}
) =>
  Effect.runPromise(
    Effect.gen(function* performImport() {
      const validated = validateRegistry(registry, trustedRequirements);
      const records = [];

      for (const task of validated.tasks) {
        records.push(
          ...(yield* Effect.tryPromise(() => store.list(externalRef(task.id))))
        );
      }

      const plan = planImport(
        registry,
        records,
        trustedRequirements,
        adoptions
      );

      const byId = new Map(plan.tasks.map((task) => [task.contract.id, task]));

      for (const edge of plan.edges.filter((item) => item.type === "blocks")) {
        if (
          byId.get(edge.from)?.record?.status === "closed" &&
          byId.get(edge.to)?.record?.status !== "closed"
        ) {
          throw new Error(
            `Prerequisite ${edge.to} would invalidate completed ${edge.from}`
          );
        }
      }

      const ids = new Map(
        plan.tasks
          .filter((task) => task.record)
          .map((task) => [task.contract.id, task.record.id])
      );

      const expectedBefore = new Set(
        resolveEdges(plan.edges, ids)
          .filter((edge) => edge.from && edge.to)
          .map(edgeKey)
      );

      const before = yield* readEdges(store, ids);
      unique(before.map(edgeKey), "native edges");

      if (before.some((edge) => !expectedBefore.has(edgeKey(edge)))) {
        throw new Error("Unexpected native dependency before import");
      }

      yield* Effect.tryPromise(() => store.assertNoCycles());

      for (const task of plan.tasks) {
        if (task.action === "create") {
          const record = yield* Effect.tryPromise(() =>
            store.create(task.contract)
          );

          ids.set(task.contract.id, record.id);
        } else if (task.action === "adopt") {
          yield* Effect.tryPromise(() =>
            store.adopt(task.record, task.contract)
          );
        }
      }

      unique([...ids.values()], "resolved native IDs");
      const expected = resolveEdges(plan.edges, ids);

      for (const edge of expected) {
        if (!before.some((item) => edgeKey(item) === edgeKey(edge))) {
          yield* Effect.tryPromise(() => store.addEdge(edge));
        }
      }

      const after = yield* readEdges(store, ids);
      assertSet(after.map(edgeKey), expected.map(edgeKey), "native edges");
      yield* Effect.tryPromise(() => store.assertNoCycles());

      return {
        actions: plan.tasks.map((task) => ({
          action: task.action,
          id: task.contract.id,
        })),
        edges: expected,
        ids: Object.fromEntries(ids),
      };
    })
  );
