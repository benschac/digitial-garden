# AW-13: Prove the complete workflow

Bead: `ps-cdek.16`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-11, AW-12 Spec acceptance criteria: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 Planned branch: None unless an integration fix needs its own diff

## What to build

Verify the integrated feature and resolve defects while preserving the small reviewed diffs.

## Owned responsibility

Coordinator-owned integration and verification. This is a gate, not an automatic extra PR.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] An authorized real browser walkthrough covers references, styles, generation, selection, approval, layers, edits, preview, export, and restart.
- [ ] The final export reconstructs offline with saved presentation settings.
- [ ] Local access restrictions and unchanged blog behavior are verified.
- [ ] Required repository checks pass and results are read; relevant checks rerun after restacks.
- [ ] Independent reviewers inspect the same stable patch, acceptance criteria, and source evidence. Required correctness, security, and complexity reviews complete.
- [ ] Fixes return to their owning diff when practical. Unverified provider quality or runtime behavior remains explicit.

## Contract for downstream work

Coordinator owns integration; reviewers are read-only.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: behavioral-verification, gascity-source-lookup, durable-work-and-replay.

Complete workflow walkthrough and repository verification fence, alongside focused checks for fixes. No publication or merge implied.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
