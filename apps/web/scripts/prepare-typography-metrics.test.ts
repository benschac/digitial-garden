import { expect, test } from "bun:test";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { decodeTypographyMetrics } from "../src/app/typography-metrics-schema";
import { prepareTypographyMetrics } from "./prepare-typography-metrics.mjs";

for (const assetDirectory of ["media", "immutable/media"]) {
  test(`publishes verified metrics for static/${assetDirectory} assets`, async () => {
    const distDir = await mkdtemp(path.join(tmpdir(), "typography-static-"));

    try {
      const media = path.join(distDir, "static", assetDirectory);
      await mkdir(media, { recursive: true });
      await copyFile(
        new URL(
          "../src/app/fonts/bonbance-bold-condensed.woff2",
          import.meta.url
        ),
        path.join(media, "compiled-font.woff2")
      );
      await writeFile(path.join(media, "image.svg"), "<svg />");
      await symlink(
        path.join(media, "compiled-font.woff2"),
        path.join(media, "link.woff2")
      );
      await prepareTypographyMetrics({ distDir });
      const output = path.join(distDir, "static/typography-metrics");
      expect(await readdir(output)).toEqual(["compiled-font.woff2.json"]);

      const result = decodeTypographyMetrics(
        JSON.parse(
          await readFile(path.join(output, "compiled-font.woff2.json"), "utf-8")
        )
      );

      expect(result.source).toBe(
        `/_next/static/${assetDirectory}/compiled-font.woff2`
      );
      expect(result.metrics.unitsPerEm).toBe(1000);
      expect(result.metrics.capHeight).toBeGreaterThan(0);
    } finally {
      await rm(distDir, { force: true, recursive: true });
    }
  });
}

test("rejects a build without compiled font assets", async () => {
  const distDir = await mkdtemp(path.join(tmpdir(), "typography-empty-"));

  try {
    await mkdir(path.join(distDir, "static"));
    await expect(prepareTypographyMetrics({ distDir })).rejects.toThrow(
      "No compiled font assets found"
    );
  } finally {
    await rm(distDir, { force: true, recursive: true });
  }
});
