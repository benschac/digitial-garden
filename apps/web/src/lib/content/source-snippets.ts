import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { createProcessor } from "@mdx-js/mdx";
import { Schema } from "effect";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { bundledLanguages } from "shiki";
import type { ShikiTransformer } from "shiki";

const gitHash = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}$/u));

export const snippetIdSchema = Schema.String.check(
  Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
);

export const snippetSnapshotSchema = Schema.Struct({
  blob: gitHash,
  commit: gitHash,
  content: Schema.String,
  path: Schema.String.check(
    Schema.isPattern(/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/u),
    Schema.makeFilter((value) =>
      value.split("/").every((part) => part !== "." && part !== "..")
    )
  ),
  repository: Schema.String.check(
    Schema.isPattern(
      /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/u
    )
  ),
});

export const parseSnippetSnapshot = Schema.decodeUnknownSync(
  snippetSnapshotSchema,
  { onExcessProperty: "error" }
);

export const sourceBlobHash = (content: string) =>
  createHash("sha1")
    .update(`blob ${Buffer.byteLength(content)}\0`)
    .update(content)
    .digest("hex");

interface MarkdownNode {
  type: string;
  children?: readonly MarkdownNode[];
  lang?: string | null;
  meta?: string | null;
  value?: string;
  position?: {
    start: { offset?: number; line: number };
    end: { offset?: number };
  };
}

interface ResolvedSnippet {
  start: number;
  end: number;
  label: string;
  url: string;
}

const readSnapshot = async (directory: string, id: string) => {
  const file = path.join(directory, `${id}.json`);

  const directoryStat = await lstat(directory);

  if (directoryStat.isSymbolicLink()) {
    throw new Error("Snapshot directory must not be a symbolic link.");
  }

  const root = await realpath(directory);
  const fileStat = await lstat(file);

  if (!fileStat.isFile() || path.dirname(await realpath(file)) !== root) {
    throw new Error(
      `Snapshot ${id} must be a regular file inside ${directory}.`
    );
  }

  const snapshot = parseSnippetSnapshot(
    JSON.parse(await readFile(file, "utf-8"))
  );

  if (sourceBlobHash(snapshot.content) !== snapshot.blob) {
    throw new Error(
      `Snapshot ${id} has a mismatched Git blob hash. Capture it again from its pinned commit.`
    );
  }

  return snapshot;
};

const makeTransformer = (
  snippets: ReadonlyMap<string, ResolvedSnippet>
): ShikiTransformer => ({
  code(node) {
    const snippet = snippets.get(this.options.meta?.__raw ?? "");

    if (!snippet) {
      return;
    }

    const lines = node.children.filter((child) => child.type === "element");
    node.children = lines
      .slice(snippet.start - 1, snippet.end)
      .flatMap((line, index) =>
        index === 0 ? [line] : [{ type: "text", value: "\n" }, line]
      );
  },
  name: "personal-site:source-snippets",
  root(node) {
    const snippet = snippets.get(this.options.meta?.__raw ?? "");

    if (!snippet) {
      return;
    }

    node.children = [
      {
        children: [
          ...node.children.filter(
            (child) => child.type !== "doctype" && child.type !== "mdxjsEsm"
          ),
          {
            children: [
              {
                children: [{ type: "text", value: snippet.label }],
                properties: { href: snippet.url },
                tagName: "a",
                type: "element",
              },
            ],
            properties: {},
            tagName: "figcaption",
            type: "element",
          },
        ],
        properties: {},
        tagName: "figure",
        type: "element",
      },
    ];
  },
});

const parseFence = (node: MarkdownNode, depth: number) => {
  const metadata = node.meta ?? "";

  const validMetadata =
    /^source=[a-z0-9]+(?:-[a-z0-9]+)* lines=[1-9]\d*-[1-9]\d*$/u.test(metadata);

  const [sourceField, linesField] = metadata.split(" ");
  const id = sourceField?.slice(7);
  const [first, last] = linesField?.slice(6).split("-") ?? [];

  if (!validMetadata || !id || !first || !last || node.value !== "") {
    throw new Error(
      "Use an empty fence with source=<id> lines=<start>-<end> and no other metadata."
    );
  }

  if (depth !== 1) {
    throw new Error("Source fences must be top-level blocks.");
  }

  const language = node.lang;

  if (
    language == null ||
    language === "" ||
    (!Object.hasOwn(bundledLanguages, language) &&
      language !== "text" &&
      language !== "txt")
  ) {
    throw new Error("Source fences require an explicit supported language.");
  }

  const start = Number(first);
  const end = Number(last);

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    end < start ||
    end - start >= 25
  ) {
    throw new Error("Select an ordered inclusive range of at most 25 lines.");
  }

  return { end, id, language, start };
};

export const prepareSourceSnippets = async (
  content: string,
  directory: string,
  fileName: string
) => {
  const tree = createProcessor({
    remarkPlugins: [remarkGfm, remarkMath],
  }).parse(content);

  const snippets = new Map<string, ResolvedSnippet>();
  const replacements: { start: number; end: number; value: string }[] = [];
  const failures: Error[] = [];

  const visit = async (node: MarkdownNode, depth: number): Promise<void> => {
    if (
      node.type === "code" &&
      /(?:^|\s)source(?:=|\s|$)/u.test(`${node.lang ?? ""} ${node.meta ?? ""}`)
    ) {
      try {
        const { end, id, language, start } = parseFence(node, depth);

        const snapshot = await readSnapshot(directory, id);

        const source = snapshot.content
          .replaceAll("\r\n", "\n")
          .replace(/\n$/u, "");

        if (end > source.split("\n").length) {
          throw new Error(
            `Range ${start}-${end} exceeds the ${source.split("\n").length}-line source file.`
          );
        }

        const identity = createHash("sha256")
          .update(JSON.stringify([snapshot, start, end]))
          .digest("hex");

        const meta = `source-snippet=${identity}`;
        snippets.set(meta, {
          end,
          label: `${snapshot.path}:${start}-${end} at ${snapshot.commit.slice(0, 12)}`,
          start,
          url: `${snapshot.repository}/blob/${snapshot.commit}/${snapshot.path.split("/").map(encodeURIComponent).join("/")}#L${start}-L${end}`,
        });
        const startOffset = node.position?.start.offset;
        const endOffset = node.position?.end.offset;

        if (startOffset === undefined || endOffset === undefined) {
          throw new Error("Source fence has no source position.");
        }

        let delimiterLength = 3;

        for (const part of source.matchAll(/`+/gu)) {
          delimiterLength = Math.max(delimiterLength, part[0].length + 1);
        }

        const delimiter = "`".repeat(delimiterLength);

        replacements.push({
          end: endOffset,
          start:
            Math.max(
              content.lastIndexOf("\n", startOffset - 1),
              content.lastIndexOf("\r", startOffset - 1)
            ) + 1,
          value: `${delimiter}${language} ${meta}\n${source}\n${delimiter}`,
        });
      } catch (error) {
        failures.push(
          new Error(
            `${fileName}:${node.position?.start.line ?? 1}: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error }
          )
        );
      }
    }

    await Promise.all(
      (node.children ?? []).map(async (child) => {
        await visit(child, depth + 1);
      })
    );
  };

  await visit(tree, 0);

  if (failures.length) {
    throw new AggregateError(
      failures,
      failures.map((error) => error.message).join("\n")
    );
  }

  let expanded = content;

  for (const replacement of replacements.toSorted(
    (a, b) => b.start - a.start
  )) {
    expanded =
      expanded.slice(0, replacement.start) +
      replacement.value +
      expanded.slice(replacement.end);
  }

  return { content: expanded, transformer: makeTransformer(snippets) };
};
