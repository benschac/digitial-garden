import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL(
    "../gascity/dependency-updates/assets/scripts/supervise-wake.sh",
    import.meta.url
  )
);

const writeJson = (file, value) => writeFileSync(file, JSON.stringify(value));
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));

const held = {
  id: "ps-one",
  metadata: { dependency_package: "alpha", dependency_phase: "review" },
  status: "blocked",
};

const fixture = (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "dependency-supervision-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const bin = path.join(root, "bin");
  mkdirSync(bin);
  const state = path.join(root, ".gc/dependency-updates/supervision/wake.json");
  const beads = path.join(root, "beads.json");
  const acknowledgements = path.join(root, "acknowledgements.json");
  const pending = path.join(root, "pending.json");
  const calls = path.join(root, "calls.jsonl");
  writeJson(beads, []);
  writeJson(acknowledgements, []);
  writeJson(pending, { in_flight: [], pending: [], schema_version: "1" });
  const mock = path.join(bin, "gc");
  writeFileSync(
    mock,
    `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const root = process.env.GC_CITY;
const mode = process.env.TEST_GC_MODE;
const file = (name) => path.join(root, name);
if (args.includes('list')) {
  if (mode === 'read-failure') process.exit(2);
  process.stdout.write(fs.readFileSync(file(args.includes('dependency-supervision') ? 'acknowledgements.json' : 'beads.json')));
} else if (args.includes('status')) {
  if (mode === 'status-failure') process.exit(2);
  process.stdout.write(fs.readFileSync(file('pending.json')));
} else if (args.includes('session') && args.includes('nudge')) {
  fs.appendFileSync(file('calls.jsonl'), JSON.stringify(args) + '\\n');
  if (mode === 'nudge-failure') process.exit(2);
  if (mode === 'hold' || mode === 'linger') {
    fs.writeFileSync(file('active-pid'), String(process.pid));
    process.on('SIGUSR1', () => process.exit(0));
    process.on('SIGTERM', () => {
      fs.writeFileSync(file('terminated'), 'yes');
      process.stderr.write('wake-terminated');
      if (mode === 'hold') process.exit(0);
    });
    process.stderr.write('wake-started');
    setInterval(() => {}, 1000);
    return;
  }
  if (mode === 'slow') {
    process.stderr.write('wake-started');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
  }
  process.stdout.write(JSON.stringify({ schema_version: '1', ok: true, queued: true,
    outcome: mode === 'bad-receipt' ? 'unknown' : 'queued', delivery: 'wait-idle', target: 'mayor' }));
} else process.exit(3);
`
  );
  chmodSync(mock, 0o755);

  const options = (mode) => ({
    encoding: "utf-8",
    env: {
      ...process.env,
      GC_CITY: root,
      PATH: `${bin}:${process.env.PATH}`,
      TEST_GC_MODE: mode,
    },
  });

  const run = (mode) => spawnSync("bash", [script], options(mode));

  const count = () =>
    existsSync(calls)
      ? readFileSync(calls, "utf-8").trim().split("\n").length
      : 0;

  return {
    acknowledgements,
    beads,
    calls,
    count,
    options,
    pending,
    root,
    run,
    state,
  };
};

const pass = (result) => assert.equal(result.status, 0, result.stderr);

test("blocked work wakes once; annotation noise does not; final audit requires acknowledgement", (t) => {
  const f = fixture(t);
  pass(f.run());
  assert.equal(f.count(), 0);
  writeJson(f.beads, [held]);
  pass(f.run());
  assert.equal(f.count(), 1);
  const args = JSON.parse(readFileSync(f.calls, "utf-8").trim());
  assert.equal(args[args.indexOf("--delivery") + 1], "wait-idle");
  writeJson(f.beads, [
    { ...held, notes: "checkpoint", updated_at: "later" },
    { id: "session", status: "in_progress" },
  ]);
  pass(f.run());
  assert.equal(f.count(), 1);
  writeJson(f.beads, [{ ...held, status: "closed" }]);
  pass(f.run());
  pass(f.run());
  assert.equal(f.count(), 2);
  writeJson(f.state, { ...readJson(f.state), sent_at: 0 });
  pass(f.run());
  assert.equal(f.count(), 3);
  writeJson(f.acknowledgements, [
    {
      assignee: "mayor",
      id: "city-supervision",
      metadata: { dependency_supervision_ack: readJson(f.state).snapshot_id },
      status: "in_progress",
    },
  ]);
  writeJson(f.state, { ...readJson(f.state), sent_at: 0 });
  pass(f.run());
  assert.equal(f.count(), 3);
  writeJson(f.beads, [held]);
  pass(f.run());
  assert.equal(f.count(), 4);
  writeJson(f.beads, [{ ...held, id: "ps-new-batch", status: "closed" }]);
  pass(f.run());
  assert.equal(f.count(), 5);
});

test("pending reminders coalesce changed work without recording it as delivered", (t) => {
  const f = fixture(t);
  writeJson(f.beads, [held]);
  pass(f.run());
  const original = readJson(f.state);
  const args = JSON.parse(readFileSync(f.calls, "utf-8").trim());
  const message = args[args.indexOf("wait-idle") + 1];
  writeJson(f.pending, {
    in_flight: [],
    pending: [{ message }],
    schema_version: "1",
  });
  writeJson(f.beads, [{ ...held, status: "open" }]);
  pass(f.run());
  assert.equal(f.count(), 1);
  assert.deepEqual(readJson(f.state), original);
  writeJson(f.pending, { in_flight: [], pending: [], schema_version: "1" });
  pass(f.run());
  assert.equal(f.count(), 2);
});

test("unchanged unfinished work gets a bounded reminder; explicit deferrals remain visible", (t) => {
  const f = fixture(t);
  writeJson(f.beads, [held]);
  pass(f.run());
  writeJson(f.state, { ...readJson(f.state), sent_at: 0 });
  pass(f.run());
  assert.equal(f.count(), 2);
  writeJson(f.beads, [
    {
      ...held,
      metadata: {
        ...held.metadata,
        dependency_decision_by: "human",
        dependency_decision_reference: "operator-message-id",
        dependency_disposition: "deferred",
      },
      status: "deferred",
    },
  ]);
  pass(f.run());
  assert.equal(f.count(), 3);
  assert.equal(readJson(f.state).snapshot.length, 1);
  writeJson(f.state, { ...readJson(f.state), sent_at: 0 });
  pass(f.run());
  assert.equal(f.count(), 4);
  writeJson(f.acknowledgements, [
    {
      assignee: "mayor",
      id: "city-supervision",
      metadata: { dependency_supervision_ack: readJson(f.state).snapshot_id },
      status: "in_progress",
    },
  ]);
  writeJson(f.state, { ...readJson(f.state), sent_at: 0 });
  pass(f.run());
  assert.equal(f.count(), 4);
});

test("snapshot inspection produces a stable acknowledgement identity without sending a wake", (t) => {
  const f = fixture(t);
  writeJson(f.beads, [held]);
  const result = spawnSync("bash", [script, "--snapshot"], f.options());
  pass(result);
  const snapshot = JSON.parse(result.stdout);
  assert.match(snapshot.snapshot_id, /^[a-f0-9]{64}$/u);
  assert.equal(snapshot.snapshot[0].id, held.id);
  assert.equal(f.count(), 0);
  assert.equal(existsSync(f.state), false);
  pass(f.run());
  assert.equal(readJson(f.state).snapshot_id, snapshot.snapshot_id);
});

test("snapshot identity preserves existing jq acknowledgements across key and record ordering", (t) => {
  const f = fixture(t);

  const records = [
    {
      ...held,
      id: "ps-z",
      metadata: {
        ...held.metadata,
        dependency_remediation: {
          10: "ten",
          2: "two",
          "\uE000": "bmp",
          "😀": "astral",
        },
        dependency_target: "2.0.0",
      },
    },
    { ...held, assignee: "worker", id: "ps-a" },
  ];

  writeJson(f.beads, records);

  const legacy = spawnSync(
    "jq",
    [
      "-cS",
      'map({id, status, assignee: (.assignee // ""), metadata}) | sort_by(.id)',
    ],
    {
      encoding: "utf-8",
      input: JSON.stringify(records),
    }
  );

  pass(legacy);

  const expectedId = createHash("sha256")
    .update(legacy.stdout.trimEnd())
    .digest("hex");

  const result = spawnSync("bash", [script, "--snapshot"], f.options());
  pass(result);
  assert.equal(JSON.parse(result.stdout).snapshot_id, expectedId);
  writeJson(f.beads, records.toReversed());
  const reordered = spawnSync("bash", [script, "--snapshot"], f.options());
  pass(reordered);
  assert.equal(JSON.parse(reordered.stdout).snapshot_id, expectedId);
});

test("raw metadata preserves legacy hash and cached state without JSON normalization", (t) => {
  const f = fixture(t);

  const raw =
    '[{"id":"ps-raw","status":"blocked","metadata":{"dependency_package":"alpha","dependency_target":1.0,"dependency_remediation":{"large":9007199254740993,"__proto__":{"x":1}}}}]';

  writeFileSync(f.beads, raw);

  const legacy = spawnSync(
    "jq",
    [
      "-cS",
      'map({id, status, assignee: (.assignee // ""), metadata}) | sort_by(.id)',
    ],
    { encoding: "utf-8", input: raw }
  );

  pass(legacy);

  const expectedId = createHash("sha256")
    .update(legacy.stdout.trimEnd())
    .digest("hex");

  const result = spawnSync("bash", [script, "--snapshot"], f.options());
  pass(result);
  assert.equal(JSON.parse(result.stdout).snapshot_id, expectedId);
  pass(f.run());

  const saved = spawnSync("jq", ["-cS", ".snapshot", f.state], {
    encoding: "utf-8",
  });

  pass(saved);
  assert.equal(saved.stdout, legacy.stdout);
  pass(f.run());
  assert.equal(f.count(), 1);
});

test("corrupt saved state fails without overwriting it or sending a wake", (t) => {
  const f = fixture(t);
  writeJson(f.beads, [held]);
  pass(f.run());

  for (const state of [
    "{",
    '{"snapshot":{},"sent_at":0}',
    '{"snapshot":[],"sent_at":-1}',
  ]) {
    writeFileSync(f.state, state);
    assert.notEqual(f.run().status, 0);
    assert.equal(readFileSync(f.state, "utf-8"), state);
    assert.equal(f.count(), 1);
  }
});

test("failed reads and rejected wake receipts do not suppress recovery", (t) => {
  const f = fixture(t);
  writeJson(f.beads, [held]);

  for (const mode of [
    "read-failure",
    "status-failure",
    "nudge-failure",
    "bad-receipt",
  ]) {
    const result = f.run(mode);

    if (mode === "bad-receipt") {
      assert.notEqual(result.status, 0);
    } else {
      assert.equal(result.status, 2, result.stderr);
    }

    assert.equal(existsSync(f.state), false);
  }

  pass(f.run());
  assert.equal(readJson(f.state).snapshot[0].id, held.id);
});

test("failed receipt publication cleans up its temporary file", (t) => {
  const f = fixture(t);
  writeJson(f.beads, [held]);
  mkdirSync(f.state, { recursive: true });
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.equal(f.count(), 1);
  assert.deepEqual(readdirSync(path.dirname(f.state)).toSorted(), [
    "wake.json",
    "wake.lock",
  ]);
});

test("malformed or partial queue and nudge results fail visibly", (t) => {
  const f = fixture(t);

  for (const value of [
    { beads: [], partial: true },
    [{ id: "ps-missing-status" }],
    [held, held],
  ]) {
    writeJson(f.beads, value);
    assert.notEqual(f.run().status, 0);
    assert.equal(existsSync(f.state), false);
  }

  writeJson(f.beads, [held]);
  writeJson(f.pending, { in_flight: [], pending: null, schema_version: "1" });
  assert.notEqual(f.run().status, 0);
  assert.equal(f.count(), 0);
});

test(
  "concurrent event and catch-up helpers share one notification lock",
  { timeout: 5000 },
  async (t) => {
    const f = fixture(t);
    writeJson(f.beads, [held]);
    const first = spawn("bash", [script], f.options("slow"));
    t.after(() => first.kill());
    const completion = once(first, "exit");
    const [signal] = await once(first.stderr, "data");
    assert.equal(signal.toString(), "wake-started");
    assert.equal(existsSync(f.calls), true);
    pass(f.run());
    assert.equal(
      spawnSync("bash", [script, "--snapshot"], f.options()).status,
      75
    );
    const [code] = await completion;
    assert.equal(code, 0);
    assert.equal(f.count(), 1);
  }
);

test(
  "termination stops the active command and releases the wake lock for recovery",
  { timeout: 5000 },
  async (t) => {
    const f = fixture(t);
    writeJson(f.beads, [held]);
    const first = spawn("bash", [script], f.options("hold"));
    t.after(() => first.kill("SIGKILL"));
    const completion = once(first, "exit");
    const [signal] = await once(first.stderr, "data");
    assert.equal(signal.toString(), "wake-started");
    const termination = once(first.stderr, "data");
    first.kill("SIGTERM");
    const [code, exitSignal] = await completion;
    assert.ok(code !== 0 || exitSignal !== null);
    const terminated = path.join(f.root, "terminated");

    const [stopped] = await termination;
    assert.equal(stopped.toString(), "wake-terminated");

    assert.equal(existsSync(terminated), true);
    assert.equal(existsSync(f.state), false);
    pass(f.run());
    assert.equal(f.count(), 2);
    assert.equal(readJson(f.state).snapshot[0].id, held.id);
  }
);

test(
  "an active command retains the lock when helper termination does not stop it",
  { timeout: 5000 },
  async (t) => {
    const f = fixture(t);
    writeJson(f.beads, [held]);
    const first = spawn("bash", [script], f.options("linger"));
    const completion = once(first, "exit");
    const closed = once(first, "close");
    const [started] = await once(first.stderr, "data");
    assert.equal(started.toString(), "wake-started");
    const pid = Number(readFileSync(path.join(f.root, "active-pid"), "utf-8"));
    t.after(() => {
      first.kill("SIGKILL");

      try {
        process.kill(pid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") {
          throw error;
        }
      }
    });
    const termination = once(first.stderr, "data");
    first.kill("SIGTERM");
    const [stopped] = await termination;
    assert.equal(stopped.toString(), "wake-terminated");
    assert.equal(
      spawnSync("bash", [script, "--snapshot"], f.options()).status,
      75
    );
    assert.equal(existsSync(f.state), false);
    assert.equal(first.exitCode, null);
    process.kill(pid, "SIGUSR1");
    const [exitCode] = await completion;
    assert.notEqual(exitCode, 0);
    await closed;
    pass(f.run());
    assert.equal(f.count(), 2);
  }
);

test("failed temporary receipt acquisition preserves an existing file", (t) => {
  const f = fixture(t);
  writeJson(f.beads, [held]);
  mkdirSync(path.dirname(f.state), { recursive: true });
  const existing = path.join(path.dirname(f.state), "wake.existing");
  writeFileSync(existing, "owned by another invocation");

  const executable = spawnSync("bun", ["-p", "process.execPath"], {
    encoding: "utf-8",
  });

  pass(executable);
  const preload = path.join(f.root, "preload.mjs");
  writeFileSync(
    preload,
    `import { mock } from "bun:test";
import * as crypto from "node:crypto";
mock.module("node:crypto", () => ({ ...crypto, randomUUID: () => "existing" }));`
  );
  const shim = path.join(f.root, "bin/bun");
  writeFileSync(
    shim,
    '#!/usr/bin/env bash\nexec "$TEST_BUN_EXECUTABLE" --preload "$TEST_BUN_PRELOAD" "$@"\n'
  );
  chmodSync(shim, 0o755);
  const options = f.options();

  const result = spawnSync("bash", [script], {
    ...options,
    env: {
      ...options.env,
      TEST_BUN_EXECUTABLE: executable.stdout.trim(),
      TEST_BUN_PRELOAD: preload,
    },
  });

  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(existing, "utf-8"), "owned by another invocation");
  assert.equal(existsSync(f.state), false);
  assert.equal(f.count(), 1);
});
