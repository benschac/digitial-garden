import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Effect } from "effect";
import { renderToStaticMarkup } from "react-dom/server";

import { AvatarArtwork } from "../src/app/_components/home/avatar-artwork";
import {
  previewDimensions,
  renderSocialPreview,
} from "./social-preview-lifecycle";
import {
  createPreviewConnection,
  previewTarget,
  spawnPreviewProcess,
} from "./social-preview-native";

const app = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(app, "public/social");
const { width, height, seconds } = previewDimensions;

const createHtml = (font: Buffer) => `<!doctype html>
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

const controller = new AbortController();
const stop = () => controller.abort();

process.on("SIGINT", stop);

process.on("SIGTERM", stop);

try {
  await Effect.runPromise(
    renderSocialPreview({
      browser: (temporary) =>
        spawnPreviewProcess(process.env.CHROMIUM_PATH ?? "chromium", [
          "--headless",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--hide-scrollbars",
          "--remote-debugging-port=0",
          `--user-data-dir=${path.join(temporary, "browser")}`,
          "about:blank",
        ]),
      connect: (url) => createPreviewConnection(new WebSocket(url)),
      encoder: (args) =>
        spawnPreviewProcess(
          "ffmpeg",
          ["-y", "-loglevel", "error", ...args],
          true
        ),
      font: () =>
        readFile(path.join(app, "src/app/fonts/bonbance-bold-condensed.woff2")),
      html: createHtml,
      mkdir: async () => {
        await mkdir(output, { recursive: true });
      },
      output,
      remove: (temporary) => rm(temporary, { force: true, recursive: true }),
      target: previewTarget,
      temporary: () => mkdtemp(path.join(tmpdir(), "home-social-")),
      write: writeFile,
    }),
    { signal: controller.signal }
  );
  console.log(`Rendered ${seconds}s social preview and poster in ${output}`);
} finally {
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);
}
