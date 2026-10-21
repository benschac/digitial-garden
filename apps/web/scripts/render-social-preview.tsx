import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { AvatarArtwork } from "../src/app/_components/home/avatar-artwork";

const app = fileURLToPath(new URL("../", import.meta.url));
const output = join(app, "public/social");
const temporary = await mkdtemp(join(tmpdir(), "home-social-"));
const width = 1200;
const height = 630;
const fps = 30;
const seconds = 8;
const font = await readFile(
  join(app, "src/app/fonts/bonbance-bold-condensed.woff2"),
);
const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Benjamin Schachter</title>
<style>
@font-face { font-family: Bonbance; src: url(data:font/woff2;base64,${font.toString("base64")}); font-weight: 700; }
* { box-sizing: border-box; }
body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: #f8f5ee; color: #211f1b; }
main { position: relative; isolation: isolate; width: 100%; height: 100%; padding: 64px; display: flex; flex-direction: column; justify-content: center; }
h1 { margin: 0; font: 700 120px/.95 Bonbance, serif; letter-spacing: -.01em; }
.portrait { position: absolute; z-index: -1; width: 960px; height: 960px; left: 420px; top: -140px; opacity: .22; transform: rotate(-12deg); }
svg { display: block; width: 100%; height: 100%; }
[data-avatar-part^="eye-"] { animation: gaze 8s infinite ease-in-out paused; }
[data-avatar-part^="brow-"] { animation: brows 8s infinite ease-in-out paused; }
[data-avatar-part^="eye-"] > path { animation: blink 8s infinite cubic-bezier(.77,0,.175,1) paused; }
@keyframes gaze {
  0%, 88%, 100% { translate: 0 0; }
  12%, 32% { translate: -7px 2px; }
  50%, 70% { translate: 7px -2px; }
}
@keyframes brows {
  0%, 88%, 100% { translate: 0 0; }
  12%, 32% { translate: -1.5px -.8px; }
  50%, 70% { translate: 1.5px -2.2px; }
}
@keyframes blink {
  0%, 6%, 8.25%, 57%, 59.25%, 100% { transform: scaleY(1); }
  7%, 58% { transform: scaleY(.08); }
}
</style><main><div class="portrait">${renderToStaticMarkup(<AvatarArtwork />)}</div>
<h1>Benjamin<br>Schachter</h1></main></html>`;

const browser = spawn(
  process.env.CHROMIUM_PATH ?? "chromium",
  [
    "--headless",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--remote-debugging-port=0",
    `--user-data-dir=${join(temporary, "browser")}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);
let socket: WebSocket | undefined;

try {
  let port: string | undefined;
  for (let attempt = 0; attempt < 100; attempt++) {
    port = await readFile(join(temporary, "browser/DevToolsActivePort"), "utf8")
      .then((contents) => contents.split("\n")[0])
      .catch(() => undefined);
    if (port) break;
    await Bun.sleep(100);
  }
  if (!port) throw new Error("Chromium did not start. Check CHROMIUM_PATH.");
  const target: unknown = await fetch(
    `http://127.0.0.1:${port}/json/new?about:blank`,
    { method: "PUT" },
  ).then((response) => response.json());
  if (
    typeof target !== "object" ||
    target === null ||
    !("webSocketDebuggerUrl" in target) ||
    typeof target.webSocketDebuggerUrl !== "string"
  ) {
    throw new Error("Chromium did not return a debugging target.");
  }
  const connection = new WebSocket(target.webSocketDebuggerUrl);
  socket = connection;
  await new Promise<void>((resolve, reject) => {
    connection.addEventListener("open", () => resolve(), { once: true });
    connection.addEventListener(
      "error",
      () => reject(new Error("Could not connect to Chromium.")),
      { once: true },
    );
  });
  let id = 0;
  const pending = new Map<
    number,
    {
      resolve: (result: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  connection.addEventListener("message", (event) => {
    const message: unknown = JSON.parse(String(event.data));
    if (
      typeof message !== "object" ||
      message === null ||
      !("id" in message) ||
      typeof message.id !== "number"
    ) {
      return;
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if ("error" in message) {
      request.reject(new Error(JSON.stringify(message.error)));
    } else if ("result" in message) {
      request.resolve(message.result);
    } else {
      request.reject(new Error("Missing Chromium command result."));
    }
  });
  async function command(method: string, params: object = {}) {
    const requestId = ++id;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Chromium timed out: ${method}`));
      }, 30_000);
      pending.set(requestId, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      connection.send(JSON.stringify({ id: requestId, method, params }));
    });
  }
  await command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const documentResult = await command("Runtime.evaluate", {
    expression: `document.open(); document.write(${JSON.stringify(html)}); document.close(); document.fonts.ready.then(() => document.querySelectorAll('[data-avatar-part^="eye-"]').length === 2 && document.fonts.check('700 120px Bonbance'))`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (
    typeof documentResult !== "object" ||
    documentResult === null ||
    !("result" in documentResult) ||
    typeof documentResult.result !== "object" ||
    documentResult.result === null ||
    !("value" in documentResult.result) ||
    documentResult.result.value !== true
  ) {
    throw new Error("Portrait or font failed to load; refusing to export.");
  }
  await mkdir(output, { recursive: true });
  for (let frame = 0; frame < fps * seconds; frame++) {
    await command("Runtime.evaluate", {
      expression: `document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = ${(frame * 1000) / fps}; })`,
    });
    const screenshot = await command("Page.captureScreenshot", { format: "png" });
    if (
      typeof screenshot !== "object" ||
      screenshot === null ||
      !("data" in screenshot) ||
      typeof screenshot.data !== "string"
    ) {
      throw new Error("Chromium did not return a screenshot.");
    }
    await Bun.write(
      join(temporary, `${String(frame).padStart(4, "0")}.png`),
      Buffer.from(screenshot.data, "base64"),
    );
  }
  for (const args of [
    [
      "-framerate", String(fps),
      "-i", join(temporary, "%04d.png"),
      "-an",
      "-c:v", "libx264",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      join(output, "home.mp4"),
    ],
    [
      "-i", join(temporary, "0000.png"),
      "-frames:v", "1",
      "-q:v", "2",
      join(output, "home.jpg"),
    ],
  ]) {
    const encoder = Bun.spawn(["ffmpeg", "-y", "-loglevel", "error", ...args], {
      stdout: "inherit",
      stderr: "inherit",
    });
    if ((await encoder.exited) !== 0) {
      throw new Error("FFmpeg could not encode the social preview.");
    }
  }
  console.log(`Rendered ${seconds}s social preview and poster in ${output}`);
} finally {
  socket?.close();
  browser.kill();
  await new Promise<void>((resolve) => {
    if (browser.exitCode !== null) resolve();
    else browser.once("exit", () => resolve());
  });
  await rm(temporary, { recursive: true, force: true });
}
