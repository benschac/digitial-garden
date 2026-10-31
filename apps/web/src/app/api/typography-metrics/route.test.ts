import { expect, test } from "bun:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

for (const environment of ["development", "production"]) {
  test(`restricts font metrics access in ${environment}`, () => {
    const directory = mkdtempSync(path.join(tmpdir(), "typography-metrics-"));
    const media = path.join(
      directory,
      environment === "development"
        ? ".next/dev/static/media"
        : ".next/static/media",
    );
    mkdirSync(media, { recursive: true });
    copyFileSync(
      new URL("../../fonts/bonbance-bold-condensed.woff2", import.meta.url),
      path.join(media, "font.woff2"),
    );
    copyFileSync(
      path.join(media, "font.woff2"),
      path.join(directory, "outside.woff2"),
    );
    symlinkSync(
      path.join(directory, "outside.woff2"),
      path.join(media, "link.woff2"),
    );
    const assets = [
      "",
      "../outside.woff2",
      "/tmp/font.woff2",
      "https://example.com/font.woff2",
      "font.txt",
      "link.woff2",
      "missing.woff2",
      "font.woff2",
    ];
    const script = `
      import { GET } from ${JSON.stringify(new URL("./route.ts", import.meta.url).href)};
      const results = [];
      for (const asset of ${JSON.stringify(assets)}) {
        const response = await GET(new Request("http://localhost/api/typography-metrics?asset=" + encodeURIComponent(asset)));
        const body = response.status === 200 ? await response.json() : undefined;
        results.push({ status: response.status, source: body?.source, unitsPerEm: body?.metrics.unitsPerEm, cache: response.headers.get("Cache-Control") });
      }
      process.stdout.write(JSON.stringify(results));
    `;
    try {
      const result = Bun.spawnSync([process.execPath, "--eval", script], {
        cwd: directory,
        env: { ...process.env, NODE_ENV: environment },
      });
      expect(result.stderr.toString()).toBe("");
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.toString())).toEqual(
        environment === "production"
          ? assets.map(() => ({ status: 404, cache: null }))
          : [
              ...[400, 400, 400, 400, 400, 400, 422].map((status) => ({
                status,
                cache: null,
              })),
              {
                status: 200,
                source: "/_next/static/media/font.woff2",
                unitsPerEm: 1000,
                cache: null,
              },
            ],
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
