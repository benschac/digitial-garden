# AW-05: Resume observation and recover downloads

Bead: `ps-cdek.8`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-04 Spec acceptance criteria: 2, 9 Planned branch: codex/asset-05-run-recovery

## What to build

Reopen a pending run and reconcile its remote status. Retry a failed output download without paying for another generation.

## Owned responsibility

Recovery service, provider status/download adapters, and recovery status panel. No history-selection or style-control edits.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Known remote request IDs can resume observation after app restart where provider lookup exists.
- [ ] Unsupported or uncertain recovery is explicit and never automatically repeats a generation.
- [ ] Failed local downloads can resume without changing the generation request identity.
- [ ] Polling and downloads have bounded concurrency and owned cancellation. Stopping observation does not claim remote cancellation.
- [ ] Recovered late outputs remain tied to their original inputs and do not select themselves.

## Contract for downstream work

Reusable recovery operation consumed by AW-09; preserve AW-04's frozen run contract.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: durable-work-and-replay, retry-and-timeout-policy, bounded-work, resource-ownership.

Restart an accepted request, inject a download failure, and verify request counts. Check polling cleanup.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
