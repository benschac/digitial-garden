# AW-12: Export a portable asset bundle

Bead: `ps-cdek.15`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-10 Spec acceptance criteria: 6, 8 Planned branch: codex/asset-12-portable-export

## What to build

Download composition, all layers, scene metadata, and provenance that reconstruct the saved arrangement offline.

## Owned responsibility

Bundle assembly, validation, and export panel only; consumes AW-10 snapshots.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] One coherent project revision supplies relative paths, canvas dimensions, layer dimensions, placement, order, visibility, and motion units.
- [ ] Hidden layers are included with their visibility flags.
- [ ] Provenance preserves exact run inputs and identities without credentials or temporary signed URLs.
- [ ] All referenced files exist locally and the bundle reconstructs offline.
- [ ] Export rejects invalid, incomplete, or not-yet-reviewed layer sets even when their files exist. An eligibility check is part of the coherent snapshot.
- [ ] A concurrent edit cannot mix revisions. Missing files and interrupted exports do not report success and temporary files are cleaned up.

## Contract for downstream work

No preview renderer edits; do not add a dependency on AW-11.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: validated-input, schema-evolution, resource-ownership, typed-failures.

Offline round trip, missing asset, concurrent edit, hidden layers, and interrupted export.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
