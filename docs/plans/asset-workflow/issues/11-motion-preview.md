# AW-11: Preview parallax and maximum offsets

Bead: `ps-cdek.14`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-10 Spec acceptance criteria: 7 Planned branch: codex/asset-11-motion-preview

## What to build

Inspect saved layers at rest, under pointer and scroll motion, and at maximum configured offsets.

## Owned responsibility

Motion renderer and preview panel only; consumes AW-10 snapshots.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Preview uses the same saved placement, visibility, and motion units that export consumes.
- [ ] Reduced motion is static; manual offset inspection remains available.
- [ ] Maximum-offset views reveal exposed gaps.
- [ ] Loading, missing images, and failures are explicit. Switching projects cannot display stale completions.
- [ ] Image resources, listeners, and frames are released on replacement and unmount; existing blog rendering stays unchanged.

## Contract for downstream work

No changes to presentation storage, shared schema, or export code without coordinator approval.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: react-lifecycle, resource-ownership, replaceable-resources.

Browser checks at narrow and desktop widths, reduced motion, project switching, maximum offsets, and failure.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
