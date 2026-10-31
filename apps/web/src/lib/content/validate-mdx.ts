import { compile } from "@mdx-js/mdx";
import { Match, Schema } from "effect";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const isAllowedComponent = Schema.is(
  Schema.Literals([
    "Callout",
    "AnimatedDiagram",
    "ComingSoon",
    "EffectWalkthrough",
    "MermaidDiagram",
  ])
);

const isLiteralAttribute = Schema.is(
  Schema.Struct({
    type: Schema.Literal("mdxJsxAttribute"),
    value: Schema.NullOr(Schema.String),
  })
);

const mdxNodeSchema = Schema.Struct({
  attributes: Schema.optional(Schema.Array(Schema.Unknown)),
  children: Schema.optional(Schema.Array(Schema.Unknown)),
  data: Schema.optional(
    Schema.Struct({
      estree: Schema.optional(
        Schema.Struct({
          body: Schema.optional(Schema.Array(Schema.Unknown)),
          type: Schema.String,
        })
      ),
    })
  ),
  depth: Schema.optional(Schema.Number),
  name: Schema.optional(Schema.NullOr(Schema.String)),
  type: Schema.String,
}).check(
  Schema.makeFilter((node) =>
    Match.value(node).pipe(
      Match.when(
        { depth: 1, type: "heading" },
        () =>
          "Post bodies cannot contain an h1. Use the frontmatter title instead."
      ),
      Match.whenOr(
        { type: "mdxjsEsm" },
        { type: "mdxFlowExpression" },
        { type: "mdxTextExpression" },
        (expression) => {
          const isEmptyProgram =
            expression.data?.estree?.type === "Program" &&
            expression.data.estree.body?.length === 0;

          if (expression.type === "mdxjsEsm" || !isEmptyProgram) {
            return "MDX imports, exports, and arbitrary JavaScript expressions are disabled.";
          }
        }
      ),
      Match.whenOr(
        { type: "mdxJsxFlowElement" },
        { type: "mdxJsxTextElement" },
        (element) => {
          if (!isAllowedComponent(element.name)) {
            return `MDX component "${element.name ?? "unknown"}" is not allowlisted.`;
          }

          for (const attribute of element.attributes ?? []) {
            if (!isLiteralAttribute(attribute)) {
              return `MDX component "${element.name}" may only use literal string properties.`;
            }
          }
        }
      ),
      Match.orElse(() => true)
    )
  )
);

const parseMdxNode = Schema.decodeUnknownSync(mdxNodeSchema);

type MdxNode = typeof mdxNodeSchema.Type;

const visit = (node: MdxNode): void => {
  for (const child of node.children ?? []) {
    visit(parseMdxNode(child));
  }
};

const remarkRestrictMdx = () => (tree: MdxNode) => {
  visit(parseMdxNode(tree));
};

export const validateTrustedMdx = async (
  content: string,
  fileName: string
): Promise<void> => {
  try {
    await compile(content, {
      outputFormat: "function-body",
      remarkPlugins: [remarkRestrictMdx, remarkGfm, remarkMath],
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `Invalid post content in ${fileName}: ${error.message}`
        : `Invalid post content in ${fileName}`;

    throw new Error(message, { cause: error });
  }
};
