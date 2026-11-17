# AW-08: Approve an exact composition revision

Bead: `ps-cdek.11`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-06, AW-07 Spec acceptance criteria: 3, 4 Planned branch: codex/asset-08-approval

## What to build

Approve the selected composition and visibly invalidate approval when its generation inputs or selection change.

## Owned responsibility

Approval transitions and approval panel; consumes frozen selection and input contracts.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Approval persists the selected asset ID and exact input revision.
- [ ] Changing prompt, subject references, adopted style, or selected output invalidates approval without deleting history.
- [ ] Descriptive notes that are not sent to generation do not invalidate approval.
- [ ] Late results never approve themselves.
- [ ] A server-side approval assertion rejects stale revisions; UI disablement is not the authorization check.

## Contract for downstream work

Approval assertion and immutable approval record for AW-09.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: actor-lifecycle, validated-input, domain-boundaries, behavioral-verification.

Approve, edit, change style, select old output, late-complete, and reload sequences.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
