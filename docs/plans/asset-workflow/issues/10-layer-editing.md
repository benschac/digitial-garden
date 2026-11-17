# AW-10: Save layer presentation edits

Bead: `ps-cdek.13`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-09 Spec acceptance criteria: 6 Planned branch: codex/asset-10-layer-editing

## What to build

Rename, reorder, hide, and adjust motion settings for a layer set, with changes visible in the static inspector and retained after restart.

## Owned responsibility

Layer presentation controls and persistence commands. No motion renderer or export serializer.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Names, order, visibility, and motion values survive reload.
- [ ] The static inspector reflects order and visibility immediately.
- [ ] Coordinates and motion units are explicit and validated.
- [ ] Updates use revision checks; consumers can read a coherent immutable snapshot.
- [ ] Editing presentation does not regenerate images or invalidate composition approval.

## Contract for downstream work

Final PresentationSnapshot contract shared by AW-11 and AW-12.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: schema-evolution, validated-input, domain-boundaries.

Edit all controls, reopen, and test conflicting presentation writes.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
