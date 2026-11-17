# AW-09: Prepare and inspect transparent layers

Bead: `ps-cdek.12`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-05, AW-08 Spec acceptance criteria: 3, 5, 9 Planned branch: codex/asset-09-layer-generation

## What to build

Generate layers from a currently approved composition and inspect the persisted images individually and assembled.

## Owned responsibility

Layer adapter, preparation guidance controls, layer-set persistence, and static inspector.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Current approval is checked before submission and its identity is captured in the layer run.
- [ ] Layer runs reuse submission and recovery behavior, with no automatic paid retries.
- [ ] Invalid or incomplete outputs remain in history with an explanation; outdated sets remain available without becoming current.
- [ ] Invalid or incomplete layer sets cannot be marked verified or export-ready. LayerSet exposes validation and manual-review status for export eligibility.
- [ ] Each layer has stable identity, dimensions, placement, order, visibility, and default motion settings.
- [ ] Show original artwork, assembled layers, and individual transparency. Revised prompts can regenerate while retaining old layer sets.
- [ ] Authorized real-asset evaluation records cutout, alignment, and hidden-region quality limits.

## Contract for downstream work

LayerSet placement contract and revision-aware presentation update/read interface.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: validated-input, submission-acceptance, resource-ownership, bounded-work.

Stale approval rejection, invalid metadata, partial download recovery, late output, and real transparency inspection when authorized.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
