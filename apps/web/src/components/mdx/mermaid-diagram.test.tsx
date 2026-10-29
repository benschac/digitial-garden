import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { render } from "pele";
import { renderToStaticMarkup } from "react-dom/server";

import { MermaidDiagram } from "./mermaid-diagram";

test("renders every ledger diagram at desktop and mobile widths", () => {
  const post = readFileSync(
    new URL(
      "../../../content/posts/creating-double-sided-accounting.mdx",
      import.meta.url,
    ),
    "utf8",
  );
  const sources = [...post.matchAll(/source="([^"]+)"/g)];
  expect(sources).toHaveLength(3);
  for (const match of sources) {
    const source = match[1];
    if (!source) throw new Error("Missing diagram source");
    for (const width of [320, 768]) {
      const result = render(source, {
        maxWidth: width,
        links: false,
        images: false,
      });
      expect(result.svg).toContain("<svg");
      expect(result.svg).not.toContain("NaN");
      expect(result.width).toBeGreaterThan(0);
    }
  }
});

test("server rendering retains captions and distinct figure identities", () => {
  const html = renderToStaticMarkup(
    <>
      <MermaidDiagram
        source="flowchart TD; A --> B;"
        title="First"
        description="First caption"
      />
      <MermaidDiagram
        source="flowchart TD; A --> B;"
        title="Second"
        description="Second caption"
      />
    </>,
  );
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  expect(ids).toHaveLength(4);
  expect(html).toContain("First caption</figcaption>");
  expect(html).toContain("Second caption</figcaption>");
  expect(html).toContain("data-prose-exclude");
  expect(html).toContain("Loading diagram");
  expect(new Set(ids).size).toBe(ids.length);
});

test("server fallback keeps source out of HTML and escapes the description", () => {
  const html = renderToStaticMarkup(
    <MermaidDiagram
      source={'not-a-diagram <script>alert("test")</script>'}
      title="Invalid diagram"
      description="Read <this> description"
    />,
  );
  expect(html).toContain("Loading diagram");
  expect(html).toContain("Read &lt;this&gt; description");
  expect(html).not.toContain("<script");
});
