import assert from "node:assert/strict";
import { test } from "node:test";

import { validateEvidence } from "./orchestrator-evidence.mjs";

const expectedIdentity = () => ({
  attemptId: "attempt-1",
  baseCommit: "c".repeat(40),
  candidateCommit: "a".repeat(40),
  candidateTree: "b".repeat(40),
  taskId: "task-1",
  verifierCommit: "d".repeat(40),
});

const expectedEvidence = () => ({
  ...expectedIdentity(),
  artifacts: [
    { id: "test-log", path: "logs/test.txt", sha256: "a".repeat(64) },
    { id: "format-log", path: "logs/format.txt", sha256: "b".repeat(64) },
  ],
  checks: [
    {
      command: ["node", "--test", "scripts/orchestrator-evidence.test.mjs"],
      logArtifactId: "test-log",
      name: "test",
    },
    {
      command: ["bun", "run", "format", "--check"],
      logArtifactId: "format-log",
      name: "format",
    },
  ],
  toolchain: {
    arch: "arm64",
    bun: "1.3.1",
    node: "v24.1.0",
    platform: "darwin",
  },
});

const evidence = () => {
  const expected = expectedEvidence();

  return {
    ...expected,
    checks: expected.checks.map((check) => ({ ...check, exitCode: 0 })),
  };
};

const accepts = (record, expected) => {
  assert.deepEqual(validateEvidence(record, expected), {
    errors: [],
    ok: true,
  });
};

const rejects = (record, ...expectations) => {
  const result = validateEvidence(
    record,
    expectations.length > 0 ? expectations[0] : expectedEvidence()
  );

  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);

  for (const error of result.errors) {
    assert.match(error, /.+/u);
  }
};

const parentAt = (data, path) => {
  let parent = data;

  for (const key of path.slice(0, -1)) {
    parent = parent[key];
  }

  return parent;
};

const replaceAt = (data, path, value) => {
  parentAt(data, path)[path.at(-1)] = value;

  return data;
};

const rejectsAt = (path, value) => {
  rejects(replaceAt(evidence(), path, value));
  rejects(evidence(), replaceAt(expectedEvidence(), path, value));
  rejects(
    replaceAt(evidence(), path, value),
    replaceAt(expectedEvidence(), path, value)
  );
};

const getter = () => {
  assert.fail("validation must not execute input getters or proxy traps");
};

const hostileProxy = () =>
  new Proxy([], {
    get: getter,
    getOwnPropertyDescriptor: getter,
    getPrototypeOf: getter,
    ownKeys: getter,
  });

const nestedContainers = [
  ["toolchain"],
  ["checks"],
  ["checks", 0],
  ["checks", 0, "command"],
  ["artifacts"],
  ["artifacts", 0],
];

const nestedFields = [
  ...Object.keys(expectedEvidence().toolchain).map((field) => [
    "toolchain",
    field,
  ]),
  ...Object.keys(expectedEvidence().checks[0]).map((field) => [
    "checks",
    0,
    field,
  ]),
  ["checks", 0, "exitCode"],
  ["checks", 0, "command", 0],
  ["checks", 0, "command", 1],
  ...Object.keys(expectedEvidence().artifacts[0]).map((field) => [
    "artifacts",
    0,
    field,
  ]),
];

test("accepts successful evidence matching all expected receipt bindings without mutation", () => {
  const record = evidence();
  const expected = expectedEvidence();
  const snapshot = structuredClone({ expected, record });
  accepts(record, expected);
  assert.deepEqual({ expected, record }, snapshot);
  accepts(record, expected);
});

test("accepts frozen own data with null prototypes without normalizing values", () => {
  const freeze = (value) => {
    if (Array.isArray(value)) {
      return Object.freeze(value.map(freeze));
    }

    if (value !== null && Object.getPrototypeOf(value) === Object.prototype) {
      return Object.freeze(
        Object.assign(
          Object.create(null),
          Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, freeze(item)])
          )
        )
      );
    }

    return value;
  };

  const expected = expectedEvidence();
  const record = evidence();

  for (const data of [record, expected]) {
    data.taskId = " task-1 ";
    data.checks[0].name = " test ";
    data.artifacts[0].path = " ./logs/test.txt ";
  }

  accepts(freeze(record), freeze(expected));
  rejects(record, { ...expected, taskId: expected.taskId.trim() });
});

test("requires every expected and recorded identity and metadata field", () => {
  rejects(evidence(), undefined);

  for (const make of [evidence, expectedEvidence]) {
    for (const field of Object.keys(make())) {
      const data = Object.fromEntries(
        Object.entries(make()).filter(([key]) => key !== field)
      );

      if (make === evidence) {
        rejects(data);
      } else {
        rejects(evidence(), data);
      }
    }
  }
});

test("rejects malformed records and expected receipts without coercion", () => {
  for (const value of [null, undefined, [], "{}", true, 0, {}, new Date()]) {
    rejects(value);
    rejects(evidence(), value);
  }

  for (const field of ["taskId", "attemptId"]) {
    for (const value of [undefined, null, "", " \n", 1, {}, []]) {
      rejectsAt([field], value);
    }
  }

  for (const field of [
    "candidateCommit",
    "candidateTree",
    "baseCommit",
    "verifierCommit",
  ]) {
    for (const value of [
      undefined,
      null,
      "",
      "a".repeat(39),
      "g".repeat(40),
      `${"a".repeat(40)}\n`,
      1,
    ]) {
      rejectsAt([field], value);
    }
  }
});

test("rejects stale task, attempt, candidate, tree, base, or verifier identity", () => {
  for (const field of Object.keys(expectedIdentity())) {
    rejects({ ...evidence(), [field]: "e".repeat(40) });
    rejects(evidence(), { ...expectedEvidence(), [field]: "e".repeat(40) });
  }
});

test("requires named checks with integer zero recorded exit codes", () => {
  for (const value of [undefined, null, {}, [], [null], [[]]]) {
    rejectsAt(["checks"], value);
  }

  for (const name of [undefined, null, "", " ", 1]) {
    rejectsAt(["checks", 0, "name"], name);
  }

  for (const exitCode of [
    undefined,
    null,
    "0",
    false,
    1,
    -1,
    0.5,
    Number.NaN,
    Infinity,
  ]) {
    rejects(replaceAt(evidence(), ["checks", 1, "exitCode"], exitCode));
  }
});

test("requires a nonblank executable and string argv on both receipts", () => {
  for (const command of [
    undefined,
    null,
    "node --test",
    {},
    [],
    [""],
    [" \n"],
    [1],
    ["node", undefined],
    ["node", null],
    ["node", 1],
    ["node", {}],
    ["node", []],
  ]) {
    rejectsAt(["checks", 0, "command"], command);
  }

  const record = evidence();
  const expected = expectedEvidence();
  const command = [" node ", "", " ", "$(literal)", "a\nb", "a\u0000b"];
  record.checks[0].command = [...command];
  expected.checks[0].command = [...command];
  accepts(record, expected);

  record.checks[0].command = ["node"];
  expected.checks[0].command = ["node"];
  accepts(record, expected);
});

test("binds exact argv bytes, argument count and order, and check list order", () => {
  for (const command of [
    ["node", "--test"],
    ["node", "scripts/orchestrator-evidence.test.mjs", "--test"],
    ["node ", "--test", "scripts/orchestrator-evidence.test.mjs"],
    ["node", "--test", "./scripts/orchestrator-evidence.test.mjs"],
    ["node", "--test", "scripts/orchestrator-evidence.test.mjs", ""],
  ]) {
    rejects(replaceAt(evidence(), ["checks", 0, "command"], command));
    rejects(
      evidence(),
      replaceAt(expectedEvidence(), ["checks", 0, "command"], command)
    );
  }

  const record = evidence();
  const expected = expectedEvidence();
  record.checks[0].command = ["node", ""];
  expected.checks[0].command = ["node"];
  rejects(record, expected);
  record.checks[0].command = ["node", " "];
  expected.checks[0].command = ["node", ""];
  rejects(record, expected);

  rejects({ ...evidence(), checks: evidence().checks.toReversed() });
  rejects(evidence(), {
    ...expectedEvidence(),
    checks: expectedEvidence().checks.toReversed(),
  });
  rejects({ ...evidence(), checks: evidence().checks.slice(0, 1) });
  rejects(evidence(), {
    ...expectedEvidence(),
    checks: expectedEvidence().checks.slice(0, 1),
  });
  rejects(replaceAt(evidence(), ["checks", 0, "name"], "different-test"));
});

test("rejects duplicate check names on either receipt even when both match", () => {
  rejectsAt(["checks", 1, "name"], "test");
});

test("requires and exactly binds all toolchain identities", () => {
  for (const value of [undefined, null, [], "toolchain", {}, new Date()]) {
    rejectsAt(["toolchain"], value);
  }

  for (const field of Object.keys(expectedEvidence().toolchain)) {
    for (const value of [undefined, null, "", " \n", 1, {}, []]) {
      rejectsAt(["toolchain", field], value);
    }

    rejects(replaceAt(evidence(), ["toolchain", field], "changed"));
    rejects(
      evidence(),
      replaceAt(expectedEvidence(), ["toolchain", field], "changed")
    );
  }
});

test("requires nonempty artifacts with unique ids, nonblank paths and full hex digests", () => {
  for (const value of [undefined, null, {}, [], [null], [[]]]) {
    rejectsAt(["artifacts"], value);
  }

  for (const field of ["id", "path"]) {
    for (const value of [undefined, null, "", " \n", 1, {}, []]) {
      rejectsAt(["artifacts", 0, field], value);
    }
  }

  for (const value of [
    undefined,
    null,
    "",
    "a".repeat(63),
    "a".repeat(65),
    "g".repeat(64),
    `${"a".repeat(64)}\n`,
    1,
    {},
    [],
  ]) {
    rejectsAt(["artifacts", 0, "sha256"], value);
  }

  rejectsAt(["artifacts", 1, "id"], "test-log");
});

test("binds exact artifact list order, id, path and digest without normalization", () => {
  for (const [field, value] of [
    ["path", "./logs/test.txt"],
    ["sha256", "c".repeat(64)],
    ["sha256", "A".repeat(64)],
  ]) {
    rejects(replaceAt(evidence(), ["artifacts", 0, field], value));
    rejects(
      evidence(),
      replaceAt(expectedEvidence(), ["artifacts", 0, field], value)
    );
  }

  const record = evidence();
  record.artifacts[0].id = "different-log";
  record.checks[0].logArtifactId = "different-log";
  rejects(record);
  const expected = expectedEvidence();
  expected.artifacts[0].id = "different-log";
  expected.checks[0].logArtifactId = "different-log";
  rejects(evidence(), expected);
  rejects({ ...evidence(), artifacts: evidence().artifacts.toReversed() });
  rejects(evidence(), {
    ...expectedEvidence(),
    artifacts: expectedEvidence().artifacts.toReversed(),
  });

  const extra = { id: "extra", path: "extra.txt", sha256: "F".repeat(64) };
  rejects({ ...evidence(), artifacts: [...evidence().artifacts, extra] });
  rejects(evidence(), {
    ...expectedEvidence(),
    artifacts: [...expectedEvidence().artifacts, extra],
  });
  accepts(
    { ...evidence(), artifacts: [...evidence().artifacts, extra] },
    {
      ...expectedEvidence(),
      artifacts: [...expectedEvidence().artifacts, extra],
    }
  );
});

test("requires every check log to resolve and binds the chosen artifact exactly", () => {
  for (const value of [undefined, null, "", " \n", 1, {}, [], "absent-log"]) {
    rejectsAt(["checks", 0, "logArtifactId"], value);
  }

  rejects(replaceAt(evidence(), ["checks", 0, "logArtifactId"], "format-log"));
  rejects(
    evidence(),
    replaceAt(expectedEvidence(), ["checks", 0, "logArtifactId"], "format-log")
  );
});

test("rejects arrays with object prototypes at every object boundary", () => {
  for (const prototype of [null, Object.prototype]) {
    rejects(Object.assign(Object.setPrototypeOf([], prototype), evidence()));
    rejects(
      evidence(),
      Object.assign(Object.setPrototypeOf([], prototype), expectedEvidence())
    );

    for (const path of [["toolchain"], ["checks", 0], ["artifacts", 0]]) {
      const valid = parentAt(evidence(), path)[path.at(-1)];
      rejectsAt(
        path,
        Object.assign(Object.setPrototypeOf([], prototype), valid)
      );
    }
  }
});

test("does not trust inherited properties or class instances at object boundaries", () => {
  rejects(Object.create(evidence()));
  rejects(evidence(), Object.create(expectedEvidence()));

  for (const path of [["toolchain"], ["checks", 0], ["artifacts", 0]]) {
    const valid = parentAt(expectedEvidence(), path)[path.at(-1)];
    rejectsAt(path, Object.create(valid));
    rejectsAt(path, Object.assign(new Date(), valid));

    for (const field of Object.keys(valid)) {
      const partial = Object.assign(
        Object.create(null),
        Object.fromEntries(
          Object.entries(valid).filter(([key]) => key !== field)
        )
      );

      rejectsAt(path, partial);
    }
  }
});

test("does not execute getters at any required field or array index", () => {
  for (const make of [evidence, expectedEvidence]) {
    const paths = [
      ...Object.keys(make()).map((field) => [field]),
      ...nestedContainers,
      ...nestedFields.filter(
        (path) => make === evidence || path.at(-1) !== "exitCode"
      ),
    ];

    for (const path of paths) {
      const data = make();
      Object.defineProperty(parentAt(data, path), path.at(-1), { get: getter });

      if (make === evidence) {
        rejects(data);
      } else {
        rejects(evidence(), data);
      }
    }
  }
});

test("rejects proxies and revoked proxies at all containers without invoking traps", () => {
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();

  for (const value of [hostileProxy(), revoked.proxy]) {
    rejects(value);
    rejects(evidence(), value);

    for (const path of nestedContainers) {
      rejectsAt(path, value);
    }
  }
});

test("rejects hostile scalar fields without coercion or diagnostic inspection", () => {
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();

  for (const value of [hostileProxy(), revoked.proxy]) {
    for (const field of Object.keys(expectedIdentity())) {
      rejectsAt([field], value);
    }

    for (const path of nestedFields.filter(
      (item) => item.at(-1) !== "exitCode"
    )) {
      rejectsAt(path, value);
    }

    rejects(replaceAt(evidence(), ["checks", 0, "exitCode"], value));
  }
});

test("rejects sparse or inherited array entries in checks, artifacts and argv", () => {
  for (const path of [["checks"], ["artifacts"], ["checks", 0, "command"]]) {
    for (const index of [0, 1]) {
      const valid = parentAt(evidence(), path)[path.at(-1)];
      const sparse = [...valid];
      Reflect.deleteProperty(sparse, String(index));
      rejectsAt(path, sparse);
      const prototype = Object.create(Array.prototype);
      Object.defineProperty(prototype, String(index), { get: getter });
      Object.setPrototypeOf(sparse, prototype);
      rejectsAt(path, sparse);
    }
  }
});

test("ignores unrelated properties without reading their getters or iterators", () => {
  const record = evidence();
  const expected = expectedEvidence();

  for (const data of [record, expected]) {
    for (const value of [
      data,
      data.toolchain,
      data.checks,
      data.checks[0],
      data.checks[0].command,
      data.artifacts,
      data.artifacts[0],
    ]) {
      Object.defineProperty(value, "unrelated", { get: getter });
      Object.defineProperty(value, Symbol.iterator, { get: getter });
    }
  }

  accepts(record, expected);
});
