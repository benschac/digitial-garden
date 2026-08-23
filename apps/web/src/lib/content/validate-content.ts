import path from "node:path";
import { loadPostRegistry } from "./source";

const posts = await loadPostRegistry({
  contentDirectory: path.join(process.cwd(), "content", "posts"),
  publicDirectory: path.join(process.cwd(), "public"),
});

console.log(`Validated ${posts.length} blog posts.`);
