# AW-04: Generate a composition safely

Bead: `ps-cdek.7`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-02 Spec acceptance criteria: 2, 4, 9 Planned branch: codex/asset-04-composition-submit

## What to build

Run a prompt with subject references, see progress, and retain the resulting images and immutable inputs. This slice already prevents unsafe duplicate submission.

## Owned responsibility

Composition adapter, submission owner, run storage, download boundary, and run panel.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Persist logical submission identity and its input snapshot before attempting the provider call.
- [ ] Accepted request IDs and failed or uncertain outcomes persist. A crash, timeout, double-click, or reload never triggers automatic resubmission.
- [ ] Successful runs save outputs locally; reruns append records instead of overwriting them.
- [ ] Inputs remain inspectable; credentials stay server-side. Editing current inputs cannot mutate an active run.
- [ ] Before AW-05, interrupted runs remain honestly unknown or pending. The UI does not claim automatic recovery.

## Contract for downstream work

Immutable RunSnapshot, submission and result contracts, optional explicit style input shape, read-only history API, and distinct recovery extension point.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: submission-acceptance, typed-failures, runtime-boundary, durable-work-and-replay.

Accepted, rejected, unknown, duplicate-click, and late-result scenarios through the provider boundary; an authorized real generation.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
