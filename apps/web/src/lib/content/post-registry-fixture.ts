import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createBuilder } from "@content-collections/core";
import { Schema } from "effect";

import { postMetadataSchema, sortPostsNewestFirst } from "./schema";

const parsePostRecords = Schema.decodeUnknownSync(
  Schema.Array(
    Schema.Struct({
      ...postMetadataSchema.fields,
      mdx: Schema.String,
      sourceFile: Schema.String,
    })
  )
);

export const loadPostRegistry = async (
  paths: {
    contentDirectory: string;
    publicDirectory: string;
  },
  temporaryDirectories: string[]
) => {
  const root = path.dirname(paths.publicDirectory);
  await mkdir(path.join(process.cwd(), ".content-collections"), {
    recursive: true,
  });

  const buildDirectory = await mkdtemp(
    path.join(process.cwd(), ".content-collections/test-")
  );

  temporaryDirectories.push(buildDirectory);
  const configPath = path.join(buildDirectory, "content-collections.ts");

  const collectionPath = path.join(
    process.cwd(),
    "src/lib/content/collection.ts"
  );

  await writeFile(
    configPath,
    `import { createPostsCollection } from ${JSON.stringify(collectionPath)};
export default { content: [createPostsCollection(${JSON.stringify(root)}, ${JSON.stringify(path.relative(buildDirectory, paths.contentDirectory))})] };`
  );
  const builder = await createBuilder(configPath);
  const errors: string[] = [];
  builder.on("_error", (event) => {
    errors.push(event.error.message);
  });

  try {
    await builder.build();
  } catch (error) {
    if (!errors.length) {
      throw error;
    }
  }

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  const generatedPath = path.join(
    buildDirectory,
    ".content-collections/generated/index.js"
  );

  const { allPosts } = await import(pathToFileURL(generatedPath).href);

  return sortPostsNewestFirst(parsePostRecords(allPosts));
};
