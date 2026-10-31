import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { fromFile } from "@capsizecss/unpack/fs";

export const prepareTypographyMetrics = async ({ distDir }) => {
  const media = path.join(distDir, "static/media");
  const output = path.join(distDir, "static/typography-metrics");
  const files = await readdir(media, { withFileTypes: true });
  await mkdir(output, { recursive: true });
  await Promise.all(
    files
      .filter(
        (file) => file.isFile() && /\.(?:woff2?|otf|ttf)$/u.test(file.name)
      )
      .map(async (file) => {
        await writeFile(
          path.join(output, `${file.name}.json`),
          JSON.stringify({
            metrics: await fromFile(path.join(media, file.name)),
            source: `/_next/static/media/${file.name}`,
          })
        );
      })
  );
};
