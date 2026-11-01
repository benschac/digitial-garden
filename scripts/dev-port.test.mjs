import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  devOptions,
  findAvailablePort,
} from "../apps/web/scripts/dev-port.mjs";

const occupy = async (t, port = 0, host = "0.0.0.0") => {
  const server = createServer();
  server.listen({ host, port });
  await once(server, "listening");
  t.after(() => promisify(server.close.bind(server))());

  return server.address().port;
};

test("development port defaults to 3000 and respects shell PORT", () => {
  assert.equal(devOptions([], {}).port, 3000);
  assert.equal(devOptions([], { PORT: "4000" }).port, 4000);
});

test("CLI port forms override PORT and preserve unrelated Next arguments", () => {
  for (const flags of [
    ["--port", "4100"],
    ["-p", "4100"],
    ["--port=4100"],
    ["-p4100"],
  ]) {
    assert.deepEqual(
      devOptions([...flags, "--webpack", "-H", "127.0.0.1"], { PORT: "4000" }),
      {
        args: ["--webpack", "-H", "127.0.0.1"],
        hostname: "127.0.0.1",
        port: 4100,
      }
    );
  }

  assert.deepEqual(devOptions(["-p", "4000", "--port=4200"], {}), {
    args: [],
    hostname: "0.0.0.0",
    port: 4200,
  });
});

test("invalid ports fail instead of silently falling back", () => {
  for (const port of ["", "abc", "3000abc", "-1", "1.5", "65536"]) {
    assert.throws(
      () => devOptions([], { PORT: port }),
      /Invalid development port/u
    );
  }

  assert.throws(() => devOptions(["--port"], {}));
  assert.equal(devOptions(["--port", "0"], {}).port, 0);
});

test("an available preferred port is kept and the probe is released", async (t) => {
  const port = await findAvailablePort(0);
  assert.ok(port > 0);
  assert.equal(await findAvailablePort(port), port);
  assert.equal(await occupy(t, port), port);
});

test("an occupied preferred port falls back without stopping its server", async (t) => {
  const port = await occupy(t);
  const selected = await findAvailablePort(port);
  assert.ok(selected > port);
  assert.equal(await occupy(t, selected), selected);
});

test("default binding detects a port occupied on IPv4 localhost", async (t) => {
  const port = await occupy(t, 0, "127.0.0.1");
  assert.ok((await findAvailablePort(port)) > port);
  assert.ok((await findAvailablePort(port, "127.0.0.1")) > port);
});

test("bind failures other than address-in-use are surfaced", async () => {
  await assert.rejects(findAvailablePort(3000, "dev-port-test.invalid"), {
    code: "ENOTFOUND",
  });
});

test("the development launcher forwards help to Next", () => {
  const result = spawnSync(process.execPath, ["scripts/dev.mjs", "--help"], {
    cwd: fileURLToPath(new URL("../apps/web", import.meta.url)),
    encoding: "utf-8",
    env: { ...process.env, PORT: "4000" },
    timeout: 10_000,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: next dev/u);
});

test("synchronous listen failures reject without an unhandled aborted listener", async () => {
  await assert.rejects(findAvailablePort(-1), { code: "ERR_SOCKET_BAD_PORT" });
  await assert.rejects(findAvailablePort(3000, true), {
    code: "ERR_INVALID_ARG_TYPE",
  });
  await setImmediate();
});
