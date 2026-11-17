# AW-06: Compare history and select an output

Bead: `ps-cdek.9`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-04 Spec acceptance criteria: 2, 3 Planned branch: codex/asset-06-output-selection

## What to build

Browse retained composition outputs, compare them, and explicitly select the image that later stages will use.

## Owned responsibility

History and selection panel plus a narrow persisted selection command. No recovery or style integration edits.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Previous outputs remain viewable after reruns and restart.
- [ ] Selection persists independently of job completion and is not approval.
- [ ] A late completion does not replace the user's selection.
- [ ] Pending and unknown history entries remain understandable before recovery is available.
- [ ] Selection changes expose a stable revision identity for approval.

## Contract for downstream work

SelectedComposition identity and revision; history reads AW-04 without modifying submission.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: submission-acceptance, domain-boundaries, behavioral-verification.

Compare two outputs, select an older one, reload, then complete a third run late.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
