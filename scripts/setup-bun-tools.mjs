import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { archives, revision } from "./bun-tools-version.mjs";

const destination = fileURLToPath(
  new URL("../.tools/bun/bun", import.meta.url),
);
const installed = spawnSync(destination, ["--revision"], { encoding: "utf8" });
if (installed.status === 0 && installed.stdout.trim() === revision) {
  console.log(`Project-local Bun ${revision} is already installed.`);
} else {
  const asset = archives[`${process.platform}-${process.arch}`];
  if (!asset)
    throw new Error("Bun tooling supports macOS/Linux arm64 and x64.");
  const temporary = mkdtempSync(join(tmpdir(), "personal-site-bun-tools-"));
  try {
    const response = await fetch(
      `https://github.com/oven-sh/bun/releases/download/canary/${asset.name}.zip`,
      { signal: AbortSignal.timeout(60_000) },
    );
    if (!response.ok)
      throw new Error(`Bun download failed: HTTP ${response.status}`);
    const archive = Buffer.from(await response.arrayBuffer());
    if (createHash("sha256").update(archive).digest("hex") !== asset.sha256) {
      throw new Error(
        "Canary archive changed. Review and update scripts/bun-tools-version.mjs; refusing to install an unverified binary.",
      );
    }
    const zip = join(temporary, "bun.zip");
    writeFileSync(zip, archive);
    const unpack = spawnSync("unzip", ["-q", zip, "-d", temporary], {
      encoding: "utf8",
    });
    if (unpack.error || unpack.status !== 0) {
      throw new Error(unpack.error?.message ?? unpack.stderr);
    }
    const binary = join(temporary, asset.name, "bun");
    const check = spawnSync(binary, ["--revision"], { encoding: "utf8" });
    if (check.status !== 0 || check.stdout.trim() !== revision) {
      throw new Error("Unexpected Bun revision");
    }
    mkdirSync(fileURLToPath(new URL("../.tools/bun/", import.meta.url)), {
      recursive: true,
    });
    copyFileSync(binary, destination);
    chmodSync(destination, 0o755);
    console.log(`Installed project-local Bun ${revision}.`);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
