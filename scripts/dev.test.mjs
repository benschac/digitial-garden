import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout } from "node:timers/promises";

const scriptsDirectory = import.meta.dirname;

const execaDirectory = path.dirname(
  createRequire(import.meta.url).resolve("execa")
);

const executable = `#!/usr/bin/env node
import { spawn } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const kind = path.basename(process.argv[1]);
const phase = kind === "gc" ? args[2] : "turbo";
const event = (name, details = {}) => appendFileSync(process.env.DEV_TEST_EVENTS, JSON.stringify({name, pid: process.pid, ...details}) + "\\n");
event(phase, {args, marker: process.env.DEV_TEST_MARKER});
const hold = (name) => {
  const timer = setInterval(() => {
    if (existsSync(process.env.DEV_TEST_ROOT + "/release-" + name)) {
      clearInterval(timer);
      event(name + "-done");
      process.exit(Number(process.env.DEV_TEST_EXIT || 0));
    }
  }, 10);
};
if (phase === "status") {
  process.stdout.write(process.env.DEV_TEST_STATUS || JSON.stringify({controller: {running: process.env.DEV_TEST_RUNNING === "true"}}));
} else if (phase === "start") {
  if (process.env.DEV_TEST_START_HOLD) hold("start");
  else process.exit(Number(process.env.DEV_TEST_START_EXIT || 0));
} else if (phase === "stop") {
  if (process.env.DEV_TEST_STOP_HOLD) hold("stop");
  else process.exit(Number(process.env.DEV_TEST_STOP_EXIT || 0));
} else {
  process.stdout.write("forwarded stdout\\n");
  process.stderr.write("forwarded stderr\\n");
  if (process.env.DEV_TEST_SIGNAL) {
    process.kill(process.pid, process.env.DEV_TEST_SIGNAL);
  } else if (process.env.DEV_TEST_HOLD) {
    const child = spawn(process.execPath, ["-e", 'const fs=require("node:fs");fs.appendFileSync(process.env.DEV_TEST_EVENTS,JSON.stringify({name:"descendant",pid:process.pid})+"\\\\n");process.on("SIGTERM",()=>{fs.appendFileSync(process.env.DEV_TEST_EVENTS,JSON.stringify({name:"descendant-exit",pid:process.pid})+"\\\\n");process.exit(0)});setInterval(()=>{},1000)'], {stdio: "ignore"});
    process.on("SIGTERM", () => {
      event("turbo-terminated");
      child.once("exit", () => { event("turbo-exit"); process.exit(0); });
    });
    hold("turbo");
  } else {
    process.exit(Number(process.env.DEV_TEST_EXIT || 0));
  }
}
`;

const events = (root) => {
  const filename = path.join(root, "events.jsonl");

  return existsSync(filename)
    ? readFileSync(filename, "utf-8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
};

const waitFor = (predicate, description, deadline = Date.now() + 10_000) => {
  if (predicate()) {
    return Promise.resolve();
  }

  assert.ok(Date.now() < deadline, description);

  return setTimeout(10).then(() => waitFor(predicate, description, deadline));
};

const alive = (pid) => {
  try {
    process.kill(pid, 0);

    return true;
  } catch (error) {
    if (error.code !== "ESRCH") {
      throw error;
    }

    return false;
  }
};

const fixture = async (t, options = {}) => {
  const root = await mkdtemp(path.join(tmpdir(), "development-session-"));
  const children = [];
  t.after(async () => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }

    for (const event of events(root)) {
      if (alive(event.pid)) {
        process.kill(event.pid, "SIGKILL");
      }
    }

    await Promise.all(children.map((child) => child.done));
    await rm(root, { force: true, recursive: true });
  });
  await mkdir(path.join(root, "scripts"), { recursive: true });
  await mkdir(path.join(root, "bin"));
  await mkdir(path.join(root, "node_modules"));
  await symlink(execaDirectory, path.join(root, "node_modules", "execa"));
  await symlink(
    path.join(root, "bin"),
    path.join(root, "node_modules", ".bin")
  );
  await copyFile(
    path.join(scriptsDirectory, "dev.sh"),
    path.join(root, "scripts", "dev.sh")
  );

  if (existsSync(path.join(scriptsDirectory, "dev.mjs"))) {
    await copyFile(
      path.join(scriptsDirectory, "dev.mjs"),
      path.join(root, "scripts", "dev.mjs")
    );
  }

  await Promise.all(
    ["gc", "turbo"].map((name) =>
      writeFile(path.join(root, "bin", name), executable, { mode: 0o755 })
    )
  );

  if (options.initialized !== false) {
    await mkdir(path.join(root, ".tools", "gascity"), { recursive: true });
    await writeFile(path.join(root, ".tools", "gascity", "city.toml"), "");
  }

  const launch = (overrides = {}, args = []) => {
    const child = spawn("bash", ["scripts/dev.sh", ...args], {
      cwd: root,
      env: {
        ...process.env,
        DEV_TEST_EVENTS: path.join(root, "events.jsonl"),
        DEV_TEST_ROOT: root,
        PATH: `${path.join(root, "bin")}:${process.env.PATH}`,
        ...overrides,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdoutText = "";
    child.stderrText = "";
    child.stdout.on("data", (chunk) => {
      child.stdoutText += chunk;
    });
    child.stderr.on("data", (chunk) => {
      child.stderrText += chunk;
    });
    child.done = once(child, "close").then(([code, signal]) => ({
      code,
      signal,
    }));
    children.push(child);

    return child;
  };

  return {
    event: (name) =>
      waitFor(
        () => events(root).some((event) => event.name === name),
        `Missing ${name} event`
      ),
    launch,
    root,
  };
};

test(
  "development refuses missing initialization and invalid controller state",
  { timeout: 15_000 },
  async (t) => {
    const missing = await fixture(t, { initialized: false });
    const child = missing.launch();
    const result = await child.done;
    assert.equal(result.code, 1);
    assert.match(child.stderrText, /not initialized/u);
    assert.deepEqual(events(missing.root), []);

    await Promise.all(
      ["not-json", '{"controller":{"running":"false"}}'].map(async (status) => {
        const invalid = await fixture(t);

        const invalidResult = await invalid.launch({ DEV_TEST_STATUS: status })
          .done;

        assert.notEqual(invalidResult.code, 0);
        assert.deepEqual(
          events(invalid.root).map((event) => event.name),
          ["status"]
        );
      })
    );
  }
);

test(
  "development preserves city ownership and forwards arguments, environment and stdio",
  { timeout: 15_000 },
  async (t) => {
    await Promise.all(
      ["false", "true"].map(async (running) => {
        const f = await fixture(t);

        const child = f.launch(
          { DEV_TEST_MARKER: "inherited", DEV_TEST_RUNNING: running },
          ["--filter=@personal-site/web", "--", "a b"]
        );

        const result = await child.done;
        assert.equal(result.code, 0, child.stderrText);
        assert.deepEqual(
          events(f.root).map((event) => event.name),
          running === "true"
            ? ["status", "turbo"]
            : ["status", "start", "turbo", "stop"]
        );
        assert.deepEqual(
          events(f.root).find((event) => event.name === "turbo").args,
          [
            "run",
            "dev",
            "--ui=stream",
            "--filter=@personal-site/web",
            "--",
            "a b",
          ]
        );
        assert.equal(
          events(f.root).find((event) => event.name === "turbo").marker,
          "inherited"
        );
        assert.match(child.stdoutText, /forwarded stdout/u);
        assert.match(child.stderrText, /forwarded stderr/u);
      })
    );
  }
);

test(
  "development stops a partially started city and retains failure precedence",
  { timeout: 15_000 },
  async (t) => {
    await Promise.all(
      [
        [{ DEV_TEST_START_EXIT: "7" }, 7, ["status", "start", "stop"]],
        [
          { DEV_TEST_EXIT: "9", DEV_TEST_STOP_EXIT: "8" },
          9,
          ["status", "start", "turbo", "stop"],
        ],
        [{ DEV_TEST_STOP_EXIT: "8" }, 1, ["status", "start", "turbo", "stop"]],
        [
          { DEV_TEST_SIGNAL: "SIGTERM" },
          143,
          ["status", "start", "turbo", "stop"],
        ],
      ].map(async ([options, code, names]) => {
        const f = await fixture(t);
        const result = await f.launch(options).done;
        assert.equal(result.code, code);
        assert.deepEqual(
          events(f.root).map((event) => event.name),
          names
        );
      })
    );
  }
);

test(
  "development retains the checkout lock throughout cleanup and releases it afterward",
  { timeout: 15_000 },
  async (t) => {
    const f = await fixture(t);
    const first = f.launch({ DEV_TEST_STOP_HOLD: "1" });
    await f.event("stop");
    const competing = f.launch();
    const competingResult = await competing.done;
    assert.equal(competingResult.code, 1);
    assert.match(competing.stderrText, /already running/u);
    await writeFile(path.join(f.root, "release-stop"), "");
    const firstResult = await first.done;
    const nextResult = await f.launch({ DEV_TEST_RUNNING: "true" }).done;
    assert.equal(firstResult.code, 0);
    assert.equal(nextResult.code, 0);
  }
);

test(
  "development interruption reaps Turbo descendants before stopping its city",
  { timeout: 15_000 },
  async (t) => {
    await Promise.all(
      [
        ["SIGINT", 130],
        ["SIGTERM", 143],
      ].map(async ([signal, code]) => {
        const f = await fixture(t);
        const child = f.launch({ DEV_TEST_HOLD: "1" });
        await f.event("descendant");
        const turbo = events(f.root).find((event) => event.name === "turbo");

        const descendant = events(f.root).find(
          (event) => event.name === "descendant"
        );

        child.kill(signal);
        const result = await child.done;
        assert.equal(result.code, code);
        await waitFor(
          () => !alive(turbo.pid) && !alive(descendant.pid),
          "Turbo descendants survived interruption"
        );
        const names = events(f.root).map((event) => event.name);
        assert.ok(
          names.indexOf("turbo-exit") < names.indexOf("stop"),
          names.join(",")
        );
        assert.equal(names.filter((name) => name === "stop").length, 1);
      })
    );
  }
);

test(
  "development interruption during startup still stops the partially owned city",
  { timeout: 15_000 },
  async (t) => {
    const f = await fixture(t);
    const child = f.launch({ DEV_TEST_START_HOLD: "1" });
    await f.event("start");
    child.kill("SIGTERM");
    const result = await child.done;
    assert.equal(result.code, 143);
    assert.deepEqual(
      events(f.root).map((event) => event.name),
      ["status", "start", "stop"]
    );
  }
);

test(
  "development retains the lock after forced launcher termination",
  { timeout: 15_000 },
  async (t) => {
    const f = await fixture(t);
    const child = f.launch({ DEV_TEST_HOLD: "1" });
    await f.event("descendant");
    const exited = once(child, "exit");
    child.kill("SIGKILL");
    await exited;
    const competing = f.launch();
    const result = await competing.done;
    assert.equal(result.code, 1);
    assert.match(competing.stderrText, /already running/u);
    assert.equal(
      events(f.root).filter((event) => event.name === "turbo").length,
      1
    );
  }
);

test(
  "development preserves executable permission failure status",
  { timeout: 15_000 },
  async (t) => {
    const f = await fixture(t);
    const bin = path.join(f.root, "bin");

    const flock = execFileSync("which", ["flock"], {
      encoding: "utf-8",
    }).trim();

    await symlink(process.execPath, path.join(bin, "node"));
    await symlink(flock, path.join(bin, "flock"));
    await chmod(path.join(bin, "turbo"), 0o644);
    const child = f.launch({ PATH: `${bin}:/usr/bin:/bin` });
    const result = await child.done;
    assert.equal(result.code, 126);
    assert.deepEqual(
      events(f.root).map((event) => event.name),
      ["status", "start", "stop"]
    );
  }
);
