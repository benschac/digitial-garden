import { expect, test } from "bun:test";
import { compile } from "@mdx-js/mdx";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

test("the forces MDX emits valid prose and display math", async () => {
  const source = await Bun.file(new URL("./page.mdx", import.meta.url)).text();
  const compiled = String(
    await compile(source, {
      jsx: true,
      rehypePlugins: [rehypeKatex],
      remarkPlugins: [remarkMath],
    }),
  );

  expect(compiled).not.toContain("<p><_components.p>");
  expect(compiled).not.toContain("<p className={styles.intro}><_components.p>");
  expect(compiled.match(/className="katex-display"/g)).toHaveLength(3);
});
