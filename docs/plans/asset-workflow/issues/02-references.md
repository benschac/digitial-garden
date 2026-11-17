# AW-02: Upload and reuse project references

Bead: `ps-cdek.5`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: AW-01 Spec acceptance criteria: 1, 10 Planned branch: codex/asset-02-references

## What to build

Attach subject images to a project, inspect them, and retain their local files and identities after restart.

## Owned responsibility

Asset ingestion and reference-stage modules; extend project storage through AW-01's interface.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Uploaded references preserve their bytes, dimensions, IDs, and selection after restart.
- [ ] Unsupported or invalid images fail without changing the saved project.
- [ ] Adding or removing a generation reference advances the input revision; descriptive notes alone do not.
- [ ] Temporary preview URLs are released on replacement and unmount; file access remains inside local storage.

## Contract for downstream work

Stable AssetRef, reference input snapshot, asset read interface, and project input revision contract.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: validated-input, resource-ownership, domain-boundaries.

Upload, remove, reopen, malformed input, and interrupted attachment handling.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
