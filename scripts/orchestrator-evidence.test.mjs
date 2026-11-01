import assert from "node:assert/strict";
import { test } from "node:test";

import { validateEvidence } from "./orchestrator-evidence.mjs";

const expectedIdentity = () => ({
  baseCommit: "c".repeat(40),
  candidateCommit: "a".repeat(40),
  candidateTree: "b".repeat(40),
  taskId: "task-1",
  verifierCommit: "d".repeat(40),
});

const evidence = () => ({
  ...expectedIdentity(),
  attemptId: "attempt-1",
  checks: [
    { exitCode: 0, name: "test" },
    { exitCode: 0, name: "format" },
  ],
});

const rejects = (record, ...identities) => {
  const result = validateEvidence(
    record,
    identities.length > 0 ? identities[0] : expectedIdentity()
  );

  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);

  for (const error of result.errors) {
    assert.match(error, /.+/u);
  }
};

const getter = () => {
  assert.fail("validation must not execute input getters");
};

test("accepts successful evidence matching the complete expected identity", () => {
  const record = evidence();
  const expected = expectedIdentity();
  const snapshot = structuredClone({ expected, record });
  assert.deepEqual(validateEvidence(record, expected), {
    errors: [],
    ok: true,
  });
  assert.deepEqual({ expected, record }, snapshot);
  assert.deepEqual(validateEvidence(record, expected), {
    errors: [],
    ok: true,
  });
});

test("accepts frozen own data with null prototypes without normalizing identity", () => {
  const expected = Object.freeze(
    Object.assign(Object.create(null), expectedIdentity(), {
      taskId: " task-1 ",
    })
  );

  const record = Object.freeze(
    Object.assign(Object.create(null), evidence(), expected, {
      checks: Object.freeze([
        Object.freeze(
          Object.assign(Object.create(null), { exitCode: 0, name: " test " })
        ),
      ]),
    })
  );

  assert.deepEqual(validateEvidence(record, expected), {
    errors: [],
    ok: true,
  });
  rejects(record, { ...expected, taskId: expected.taskId.trim() });
});

test("requires every expected identity field even when the record has it", () => {
  rejects(evidence(), undefined);

  for (const field of Object.keys(expectedIdentity())) {
    const expected = Object.fromEntries(
      Object.entries(expectedIdentity()).filter(([key]) => key !== field)
    );

    rejects(evidence(), expected);
  }
});

test("rejects malformed records and expected identities without coercion", () => {
  for (const value of [null, undefined, [], "{}", true, 0, {}, new Date()]) {
    rejects(value);
    rejects(evidence(), value);
  }

  for (const field of ["taskId", "attemptId"]) {
    for (const value of [undefined, null, "", " \n", 1, {}, []]) {
      rejects({ ...evidence(), [field]: value });
    }
  }

  for (const taskId of [undefined, null, "", " \n", 1, {}, []]) {
    rejects(evidence(), { ...expectedIdentity(), taskId });
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
      rejects({ ...evidence(), [field]: value });
      rejects(evidence(), { ...expectedIdentity(), [field]: value });
    }
  }
});

test("rejects arrays with object prototypes and otherwise valid own fields", () => {
  for (const prototype of [null, Object.prototype]) {
    rejects(Object.assign(Object.setPrototypeOf([], prototype), evidence()));
    rejects(
      evidence(),
      Object.assign(Object.setPrototypeOf([], prototype), expectedIdentity())
    );
    rejects({
      ...evidence(),
      checks: [
        Object.assign(Object.setPrototypeOf([], prototype), {
          exitCode: 0,
          name: "test",
        }),
      ],
    });
  }
});

test("rejects stale task, candidate, tree, base, or verifier identity", () => {
  for (const field of Object.keys(expectedIdentity())) {
    rejects({
      ...evidence(),
      [field]: field === "taskId" ? "task-2" : "e".repeat(40),
    });
  }
});

test("requires named checks with integer zero exit codes", () => {
  const sparseChecks = [];
  sparseChecks.length = 1;

  for (const checks of [undefined, null, {}, [], [null], [[]], sparseChecks]) {
    rejects({ ...evidence(), checks });
  }

  for (const name of [undefined, null, "", " ", 1]) {
    rejects({ ...evidence(), checks: [{ exitCode: 0, name }] });
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
    rejects({
      ...evidence(),
      checks: [
        { exitCode: 0, name: "passed" },
        { exitCode, name: "invalid" },
      ],
    });
  }
});

test("does not trust inherited properties, class instances, or execute getters", () => {
  rejects(Object.create(evidence()));
  rejects(evidence(), Object.create(expectedIdentity()));
  rejects({
    ...evidence(),
    checks: [Object.create({ exitCode: 0, name: "test" })],
  });

  for (const field of Object.keys(evidence())) {
    rejects(Object.defineProperty(evidence(), field, { get: getter }));
  }

  for (const field of Object.keys(expectedIdentity())) {
    rejects(
      evidence(),
      Object.defineProperty(expectedIdentity(), field, { get: getter })
    );
  }

  for (const field of ["name", "exitCode"]) {
    const check = Object.defineProperty({ exitCode: 0, name: "test" }, field, {
      get: getter,
    });

    rejects({ ...evidence(), checks: [check] });
  }

  const checks = Object.defineProperty([{}], "0", { get: getter });
  rejects({ ...evidence(), checks });
});

test("rejects proxies and revoked proxies without invoking their traps", () => {
  const proxy = new Proxy([], {
    get: getter,
    getOwnPropertyDescriptor: getter,
    getPrototypeOf: getter,
  });

  const revoked = Proxy.revocable({}, {});
  revoked.revoke();

  for (const value of [proxy, revoked.proxy]) {
    rejects(value);
    rejects(evidence(), value);
    rejects({ ...evidence(), checks: value });
    rejects({ ...evidence(), checks: [value] });
  }
});

test("rejects hostile field values without coercion or diagnostic inspection", () => {
  const value = new Proxy(
    {},
    {
      get: getter,
      getOwnPropertyDescriptor: getter,
      getPrototypeOf: getter,
      ownKeys: getter,
    }
  );

  for (const field of [...Object.keys(expectedIdentity()), "attemptId"]) {
    rejects({ ...evidence(), [field]: value });
  }

  for (const field of Object.keys(expectedIdentity())) {
    rejects(evidence(), { ...expectedIdentity(), [field]: value });
  }

  rejects({ ...evidence(), checks: [{ exitCode: value, name: "test" }] });
  rejects({ ...evidence(), checks: [{ exitCode: 0, name: value }] });
});
