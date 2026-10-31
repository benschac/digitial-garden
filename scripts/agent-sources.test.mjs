import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  checkSource,
  fetchSource,
  run,
  validateInstalled,
} from "./agent-sources.mjs";

const fixture = (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "agent-sources-test-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const remote = path.join(root, "remote");
  mkdirSync(remote);
  run("git", ["init", "-q"], remote);
  writeFileSync(
    path.join(remote, "package.json"),
    JSON.stringify({ name: "fixture", version: "1.0.0" })
  );
  run("git", ["add", "."], remote);
  run(
    "git",
    [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.test",
      "commit",
      "-qm",
      "fixture",
    ],
    remote
  );
  run("git", ["tag", "v1.0.0"], remote);

  const source = {
    commit: run("git", ["rev-parse", "HEAD"], remote),
    name: "fixture",
    packages: [{ name: "fixture", path: "package.json", version: "1.0.0" }],
    ref: "v1.0.0",
    repository: remote,
  };

  return { cache: path.join(root, "cache"), root, source };
};

test("fetches a pinned source once and verifies its receipt offline", (t) => {
  const { cache, source } = fixture(t);
  const first = fetchSource(cache, source);
  const second = fetchSource(cache, source);
  assert.deepEqual(first, second);
  assert.equal(first.commit, source.commit);
  assert.deepEqual(readdirSync(cache), ["fixture"]);
  assert.deepEqual(checkSource(path.join(cache, source.name), source), first);
});

test("dirty mirrors are rejected without changing their files", (t) => {
  const { cache, source } = fixture(t);
  fetchSource(cache, source);
  const local = path.join(cache, source.name, "local.txt");
  writeFileSync(local, "keep my work");
  assert.throws(() => fetchSource(cache, source), /local changes/u);
  assert.equal(readFileSync(local, "utf-8"), "keep my work");
});

test("changed pins do not replace existing mirrors", (t) => {
  const { cache, source } = fixture(t);
  const original = fetchSource(cache, source);
  assert.throws(
    () => fetchSource(cache, { ...source, commit: "0".repeat(40) }),
    /does not match/u
  );
  assert.deepEqual(
    checkSource(path.join(cache, source.name), source),
    original
  );
});

test("incorrect package versions discard only the temporary checkout", (t) => {
  const { cache, source } = fixture(t);
  assert.throws(
    () =>
      fetchSource(cache, {
        ...source,
        packages: [{ name: "fixture", path: "package.json", version: "2.0.0" }],
      }),
    /must be fixture@2.0.0/u
  );
  assert.deepEqual(readdirSync(cache), []);
});

test("a moved tag cannot silently replace the recorded source commit", (t) => {
  const { cache, source } = fixture(t);
  assert.throws(
    () => fetchSource(cache, { ...source, commit: "0".repeat(40) }),
    /does not match/u
  );
  assert.deepEqual(readdirSync(cache), []);
});

test("installed dependencies must match the reference pin", (t) => {
  const { root, source } = fixture(t);
  const web = path.join(root, "apps/web");
  mkdirSync(path.join(web, "node_modules/fixture"), { recursive: true });
  writeFileSync(
    path.join(web, "package.json"),
    JSON.stringify({ dependencies: { fixture: "1.0.0" } })
  );
  const installed = path.join(web, "node_modules/fixture/package.json");
  writeFileSync(
    installed,
    JSON.stringify({ name: "fixture", version: "1.0.0" })
  );
  validateInstalled(root, [source]);
  writeFileSync(
    installed,
    JSON.stringify({ name: "fixture", version: "2.0.0" })
  );
  assert.throws(() => validateInstalled(root, [source]), /must match/u);
});
