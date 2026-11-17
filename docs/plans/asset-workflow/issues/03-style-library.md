# AW-03: Save reusable style revisions

Bead: `ps-cdek.6`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-02 Spec acceptance criteria: 1, 4 Planned branch: codex/asset-03-style-library

## What to build

Create a reusable style with reference images and written guidance. View its immutable revisions in a standalone style library.

## Owned responsibility

Style store and style-library panel. No edits to composition controls or provider submission.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Styles and their images survive restart and can be viewed from multiple projects.
- [ ] An edit creates a new revision and leaves earlier revisions readable.
- [ ] No existing project or run adopts a new revision automatically.
- [ ] The library exposes a stable revision lookup for later composition integration.

## Contract for downstream work

Immutable StyleRevision and read-only revision lookup; style adoption belongs to AW-07.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: schema-evolution, domain-boundaries, validated-input.

Create and edit a style, reopen it, and verify that both revisions retain their original content.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
