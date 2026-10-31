import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { MdxImage, MdxLink, MdxParagraph } from "./mdx-components";

test("unwraps a standalone Markdown image from its paragraph", () => {
  const html = renderToStaticMarkup(
    <MdxParagraph>
      <MdxImage alt="Example" src="/images/example.png" />
    </MdxParagraph>
  );

  expect(html).toStartWith("<figure");
  expect(html).not.toContain("<p>");
});

test("preserves paragraphs around prose", () => {
  expect(renderToStaticMarkup(<MdxParagraph>Example</MdxParagraph>)).toBe(
    "<p>Example</p>"
  );
});

test("keeps link protections and caller relationship tokens for new tabs", () => {
  const html = renderToStaticMarkup(
    <MdxLink href="https://example.com" target="_blank" rel="nofollow">
      Example
    </MdxLink>
  );

  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer nofollow"');
  expect(html).toContain(">Example</a>");
});
