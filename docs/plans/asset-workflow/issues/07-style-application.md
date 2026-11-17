# AW-07: Generate with a selected style revision

Bead: `ps-cdek.10`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-03, AW-04 Spec acceptance criteria: 1, 4 Planned branch: codex/asset-07-style-application

## What to build

Select a saved style in the composition stage and explicitly adopt revisions for subsequent generations.

## Owned responsibility

Style-to-request adapter and style selection panel. No recovery or history-selection edits.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Generation snapshots the exact selected style revision and reference IDs.
- [ ] Style edits do not change existing requests or project selections.
- [ ] Explicit adoption advances the project generation-input revision.
- [ ] Subject and style references remain distinguishable in the displayed provider inputs.
- [ ] A project can intentionally generate without a saved style.

## Contract for downstream work

Final generation input fingerprint, including explicit absence of a style; no redesign of AW-04 run storage.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: schema-evolution, domain-boundaries, validated-input.

Use one style in two projects, update one selection, and verify different immutable run inputs.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
