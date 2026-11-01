import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { fromFile } from "@capsizecss/unpack/fs";

export const prepareTypographyMetrics = async ({ distDir }) => {
  const assets = path.join(distDir, "static");
  const output = path.join(distDir, "static/typography-metrics");

  const files = await readdir(assets, {
    recursive: true,
    withFileTypes: true,
  });

  const fonts = files.filter(
    (file) => file.isFile() && /\.(?:woff2?|otf|ttf)$/u.test(file.name)
  );

  if (fonts.length === 0) {
    throw new Error(`No compiled font assets found in ${assets}`);
  }

  await mkdir(output, { recursive: true });
  await Promise.all(
    fonts.map(async (file) => {
      const source = path.join(file.parentPath, file.name);
      await writeFile(
        path.join(output, `${file.name}.json`),
        JSON.stringify({
          metrics: await fromFile(source),
          source: `/_next/static/${path.relative(assets, source).split(path.sep).join("/")}`,
        })
      );
    })
  );
};
