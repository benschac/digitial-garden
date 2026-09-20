import { defineConfig } from "@content-collections/core";
import { createPostsCollection } from "./src/lib/content/collection";

export default defineConfig({
  content: [createPostsCollection(process.cwd())],
});
