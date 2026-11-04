import { expect, test } from "bun:test";
import { doesNotReject, rejects } from "node:assert/strict";

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
    await rejects(
      validateTrustedMdx(source, "unsafe.mdx"),
      /MDX imports, exports, and arbitrary JavaScript expressions are disabled/u
    );
  });
}

for (const source of [
  '<Callout title={"computed"} />',
  '<Callout {...{title: "spread"}} />',
  '<Callout onClick={() => globalThis.alert("executed")} />',
]) {
  test(`retains literal-property restrictions: ${source}`, async () => {
    await rejects(
      validateTrustedMdx(source, "unsafe-props.mdx"),
      /may only use literal string properties/u
    );
  });
}

test("rejects comments used as property expressions during parsing", async () => {
  await rejects(
    validateTrustedMdx(
      "<Callout title={/* Editorial note */} />",
      "unsafe-props.mdx"
    ),
    /Unexpected empty expression/u
  );
});

for (const name of [
  "Callout",
  "AnimatedDiagram",
  "ComingSoon",
  "EffectWalkthrough",
  "MermaidDiagram",
]) {
  test(`accepts allowlisted ${name} with literal properties`, async () => {
    await doesNotReject(
      validateTrustedMdx(`<${name} title="Literal" />`, "allowed.mdx")
    );
  });
}

test("accepts nested content, boolean properties and editorial comments", async () => {
  await doesNotReject(
    validateTrustedMdx(
      "<Callout compact>\n\n## Heading\n\nText {/* Note */} <ComingSoon />\n\n</Callout>",
      "nested.mdx"
    )
  );
});

for (const source of [
  "<Callout>\n\n> Text {1 + 1}\n\n</Callout>",
  "<Callout>\n\n> <Unknown />\n\n</Callout>",
  '<Callout>\n\n> <ComingSoon title={"computed"} />\n\n</Callout>',
  '<Callout>\n\n> <ComingSoon {...{title: "spread"}} />\n\n</Callout>',
  "<Callout>\n\n> # Nested heading\n\n</Callout>",
]) {
  test(`reports the tree path for nested restricted content: ${source}`, async () => {
    await rejects(
      validateTrustedMdx(source, "nested-unsafe.mdx"),
      /children[\s\S]*children/u
    );
  });
}

for (const source of [
  "<Unknown />",
  "<div>HTML</div>",
  "<>Fragment</>",
  "<Callout>\n\n<Unknown />\n\n</Callout>",
]) {
  test(`rejects non-allowlisted elements: ${source}`, async () => {
    await rejects(
      validateTrustedMdx(source, "unsafe.mdx"),
      /is not allowlisted/u
    );
  });
}

for (const source of ["# Heading", "> # Nested heading"]) {
  test(`rejects body h1: ${source}`, async () => {
    await rejects(
      validateTrustedMdx(source, "heading.mdx"),
      /Post bodies cannot contain an h1/u
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
