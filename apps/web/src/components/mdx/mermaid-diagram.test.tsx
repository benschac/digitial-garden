import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { evaluate } from "@mdx-js/mdx";
import { render } from "pele";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";

import { MermaidDiagram } from "./mermaid-diagram";

test("renders every ledger diagram at desktop and mobile widths", () => {
  const post = readFileSync(
    new URL(
      "../../../content/posts/creating-double-sided-accounting.mdx",
      import.meta.url
    ),
    "utf-8"
  );

  const sources = [...post.matchAll(/source="[^"]+"/gu)].map(([attribute]) =>
    attribute.slice('source="'.length, -1)
  );

  expect(sources).toHaveLength(3);

  for (const source of sources) {
    for (const width of [320, 768]) {
      const result = render(source, {
        images: false,
        links: false,
        maxWidth: width,
      });

      expect(result.svg).toContain("<svg");
      expect(result.svg).not.toContain("NaN");
      expect(result.width).toBeGreaterThan(0);
    }
  }
});

test("compiles the ER figure with multiline source and renders its tables", async () => {
  const post = readFileSync(
    new URL(
      "../../../content/posts/creating-double-sided-accounting.mdx",
      import.meta.url
    ),
    "utf-8"
  );

  const figure = [...post.matchAll(/<MermaidDiagram[\s\S]*?\/>/gu)]
    .map((match) => match[0])
    .find((snippet) => snippet.includes('source="erDiagram'));

  if (!figure) {
    throw new Error("Missing ER figure");
  }

  let svg = "";

  const { default: Content } = await evaluate(figure, {
    ...jsxRuntime,
    useMDXComponents: () => ({
      MermaidDiagram: ({ source }: { source: string }) => {
        const result = render(source, {
          images: false,
          links: false,
          maxWidth: 320,
        });

        ({ svg } = result);

        return null;
      },
    }),
  });

  renderToStaticMarkup(<Content />);

  for (const table of [
    "profiles",
    "match_credit_accounts",
    "match_credit_ledger",
    "match_credit_purchases",
    "match_credit_packs",
    "profile_stripe_customers",
    "item_offer_threads",
  ]) {
    expect(svg).toContain(table);
  }

  expect(svg).toContain("pele-er");
  expect(svg).toContain("delta_available_credits");
  expect(svg).toContain("idempotency_key");
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
    </>
  );

  const ids = [...html.matchAll(/\sid="[^"]+"/gu)].map(([attribute]) =>
    attribute.slice(' id="'.length, -1)
  );

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
      source='not-a-diagram <script>alert("test")</script>'
      title="Invalid diagram"
      description="Read <this> description"
    />
  );

  expect(html).toContain("Loading diagram");
  expect(html).toContain("Read &lt;this&gt; description");
  expect(html).not.toContain("<script");
});
