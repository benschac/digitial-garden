import { expect, test } from "bun:test";

import { evaluate } from "@mdx-js/mdx";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";

import { validateTrustedMdx } from "./validate-mdx";

test("preserves flow and inline editorial comments without rendering them", async () => {
  const source = `Before.

{/* Editorial note with {braces} and more than one line.
Keep this note for the author. */}

After {/* Inline note */} the note.`;
  await validateTrustedMdx(source, "comments.mdx");
  const { default: Content } = await evaluate(source, jsxRuntime);
  const html = renderToStaticMarkup(<Content />);
  expect(html).toContain("Before.");
  expect(html).toContain("After");
  expect(html).toContain("the note.");
  expect(html).not.toContain("Editorial note");
  expect(html).not.toContain("Keep this note");
  expect(html).not.toContain("Inline note");
});

for (const source of [
  "{1 + 1}",
  "Text {process.env.SECRET}",
  '{/* Editorial note */ globalThis.alert("executed")}',
  '{/* Editorial note */ (() => "executed")()}',
  'import Widget from "./widget"',
  'export const value = "executed"',
]) {
  test(`rejects executable MDX: ${source}`, async () => {
    await expect(validateTrustedMdx(source, "unsafe.mdx")).rejects.toThrow(
      "MDX imports, exports, and arbitrary JavaScript expressions are disabled",
    );
  });
}

for (const source of [
  '<Callout title={"computed"} />',
  '<Callout {...{title: "spread"}} />',
]) {
  test(`retains literal-property restrictions: ${source}`, async () => {
    await expect(
      validateTrustedMdx(source, "unsafe-props.mdx"),
    ).rejects.toThrow("may only use literal string properties");
  });
}
