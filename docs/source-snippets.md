# Source-backed blog snippets

Use an empty fenced block to quote exact source instead of maintaining a copied excerpt:

````md
```ts source=class-names lines=7-7

```
````

The source ID selects `apps/web/content/snippets/class-names.json`. The snapshot contains the complete file, its Git blob identity, repository URL, commit, and original path. The rendered block includes a permalink to that commit and line range.

## Capture a source file

From the repository root, run:

```sh
bun run --cwd apps/web snippets:capture <id> <local-repo> <commit> <path> <https://github.com/owner/repo>
```

For example, the included `class-names` snapshot was captured with:

```sh
bun run --cwd apps/web snippets:capture class-names ../.. \
  0c31d19b5340e35e4dfd4993d06e2cd9fb27ba83 \
  packages/ui/src/lib/utils.ts https://github.com/benschac/digitial-garden
```

Relative repository paths resolve from `apps/web`. The command verifies that the Git origin matches the supplied public URL and that the commit contains a regular file. It rejects symlinks and non-UTF-8 content. It refuses to overwrite an existing snapshot; use a new ID when updating a quote, change its consuming fence, then remove the unused snapshot. A shallow repository must already contain the requested commit.

## Authoring rules

- Use a top-level fence with an explicit Shiki language, a `source` ID, and a single inclusive `lines=START-END` range.
- Keep the fence body empty. Use ordinary fences for illustrative code that does not quote a real file.
- Select at most 25 lines. Unknown options, duplicate options, missing snapshots, corrupt content, and out-of-bounds selections fail the build.
- Snapshots use public HTTPS GitHub repository URLs and full lowercase commit IDs. Commit the snapshot alongside its consuming post.

The capture command reads a Git object, so uncommitted working-tree edits do not enter the snapshot. Review the complete captured file before committing it. The blob hash detects accidental content edits; it does not independently authenticate the association between the declared repository, commit, and file. Capture from the intended repository and review the immutable source link.

## Build ownership

`src/lib/content/source-snippets.ts` owns snapshot validation and excerpt preparation. `collection.ts` validates source references before the MDX compiler cache and includes resolved source in its cache input. Shiki highlights the complete file before the transformer selects the requested lines, preserving multiline comments and strings.

Normal builds need neither Git history nor network access to resolve snippets. They consume the tracked snapshots under `content/`, which is already a Turbo input. Ignored library reference mirrors remain agent-only and are not required in CI or deployment. Changing a pin is an explicit authoring action; builds never follow a branch, update a mirror, or silently replace an excerpt.

This adapts Rat Stack's [pinned source snippets](https://ratstack.sh/lore/code-snippets) and [whole-file tokenization](https://ratstack.sh/lore/tokenize-before-slicing). It supports one contiguous selection and the existing MDX renderer. Multiple ranges, custom line highlights, source drift reports, snippet typechecking, and a separate agent Markdown renderer are not implemented.
