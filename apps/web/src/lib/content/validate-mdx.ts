import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const allowedComponents = new Set([
  "Callout",
  "AnimatedDiagram",
  "ComingSoon",
  "EffectWalkthrough",
  "MermaidDiagram",
]);

interface MdxNode {
  attributes?: Array<{
    type: string;
    value?: null | object | string;
  }>;
  children?: MdxNode[];
  data?: {
    estree?: {
      body?: readonly unknown[];
      type: string;
    };
  };
  depth?: number;
  name?: string | null;
  type: string;
}

function visit(node: MdxNode): void {
  if (node.type === "heading" && node.depth === 1) {
    throw new Error(
      "Post bodies cannot contain an h1. Use the frontmatter title instead.",
    );
  }

  const isExpression =
    node.type === "mdxFlowExpression" || node.type === "mdxTextExpression";
  const isEmptyProgram =
    node.data?.estree?.type === "Program" &&
    node.data.estree.body?.length === 0;
  if (node.type === "mdxjsEsm" || (isExpression && !isEmptyProgram)) {
    throw new Error(
      "MDX imports, exports, and arbitrary JavaScript expressions are disabled.",
    );
  }

  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    if (!node.name || !allowedComponents.has(node.name)) {
      throw new Error(
        `MDX component "${node.name ?? "unknown"}" is not allowlisted.`,
      );
    }

    for (const attribute of node.attributes ?? []) {
      if (
        attribute.type !== "mdxJsxAttribute" ||
        (attribute.value !== null && typeof attribute.value !== "string")
      ) {
        throw new Error(
          `MDX component "${node.name}" may only use literal string properties.`,
        );
      }
    }
  }

  for (const child of node.children ?? []) {
    visit(child);
  }
}

function remarkRestrictMdx() {
  return visit;
}

export async function validateTrustedMdx(
  content: string,
  fileName: string,
): Promise<void> {
  try {
    await compile(content, {
      outputFormat: "function-body",
      remarkPlugins: [remarkRestrictMdx, remarkGfm, remarkMath],
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid post content in ${fileName}: ${error.message}`, {
        cause: error,
      });
    }
    throw new Error(`Invalid post content in ${fileName}`);
  }
}
