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
      "MDX imports, exports, and arbitrary JavaScript expressions are disabled"
    );
  });
}

for (const source of [
  '<Callout title={"computed"} />',
  '<Callout {...{title: "spread"}} />',
  '<Callout onClick={() => globalThis.alert("executed")} />',
]) {
  test(`retains literal-property restrictions: ${source}`, async () => {
    await expect(
      validateTrustedMdx(source, "unsafe-props.mdx")
    ).rejects.toThrow("may only use literal string properties");
  });
}

test("rejects comments used as property expressions during parsing", async () => {
  await expect(
    validateTrustedMdx(
      "<Callout title={/* Editorial note */} />",
      "unsafe-props.mdx"
    )
  ).rejects.toThrow("Unexpected empty expression");
});

for (const name of [
  "Callout",
  "AnimatedDiagram",
  "ComingSoon",
  "EffectWalkthrough",
  "MermaidDiagram",
]) {
  test(`accepts allowlisted ${name} with literal properties`, async () => {
    await expect(
      validateTrustedMdx(`<${name} title="Literal" />`, "allowed.mdx")
    ).resolves.toBeUndefined();
  });
}

test("accepts nested content, boolean properties and editorial comments", async () => {
  await expect(
    validateTrustedMdx(
      "<Callout compact>\n\n## Heading\n\nText {/* Note */} <ComingSoon />\n\n</Callout>",
      "nested.mdx"
    )
  ).resolves.toBeUndefined();
});

for (const source of [
  "<Callout>\n\n> Text {1 + 1}\n\n</Callout>",
  "<Callout>\n\n> <Unknown />\n\n</Callout>",
  '<Callout>\n\n> <ComingSoon title={"computed"} />\n\n</Callout>',
  '<Callout>\n\n> <ComingSoon {...{title: "spread"}} />\n\n</Callout>',
  "<Callout>\n\n> # Nested heading\n\n</Callout>",
]) {
  test(`reports the tree path for nested restricted content: ${source}`, async () => {
    await expect(
      validateTrustedMdx(source, "nested-unsafe.mdx")
    ).rejects.toThrow(/children[\s\S]*children/u);
  });
}

for (const source of [
  "<Unknown />",
  "<div>HTML</div>",
  "<>Fragment</>",
  "<Callout>\n\n<Unknown />\n\n</Callout>",
]) {
  test(`rejects non-allowlisted elements: ${source}`, async () => {
    await expect(validateTrustedMdx(source, "unsafe.mdx")).rejects.toThrow(
      "is not allowlisted"
    );
  });
}

for (const source of ["# Heading", "> # Nested heading"]) {
  test(`rejects body h1: ${source}`, async () => {
    await expect(validateTrustedMdx(source, "heading.mdx")).rejects.toThrow(
      "Post bodies cannot contain an h1"
    );
  });
}

test("retains the filename and schema error cause", async () => {
  try {
    await validateTrustedMdx("{1 + 1}", "unsafe.mdx");
    throw new Error("Expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);

    if (!(error instanceof Error)) {
      throw error;
    }

    expect(error.message).toContain("Invalid post content in unsafe.mdx:");
    expect(error.cause).toBeInstanceOf(Error);
  }
});
