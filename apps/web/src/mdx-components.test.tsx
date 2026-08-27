import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MdxImage, MdxParagraph } from "./mdx-components";

test("unwraps a standalone Markdown image from its paragraph", () => {
  const html = renderToStaticMarkup(
    <MdxParagraph>
      <MdxImage alt="Example" src="/images/example.png" />
    </MdxParagraph>,
  );

  expect(html).toStartWith("<figure");
  expect(html).not.toContain("<p>");
});

test("preserves paragraphs around prose", () => {
  expect(renderToStaticMarkup(<MdxParagraph>Example</MdxParagraph>)).toBe(
    "<p>Example</p>",
  );
});
