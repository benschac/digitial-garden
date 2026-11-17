# AW-01: Local project workspace

Bead: `ps-cdek.4`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Blocked by: PRE-03 if the chosen canvas requires a new dependency; otherwise none Spec acceptance criteria: 1, 10 Planned branch: codex/asset-01-projects

Landing lane: First usable product diff after the applicable dependency prerequisite. It does not wait for generation or styles.

## What to build

Save and reopen a project with its title, notes, and preconnected workflow shell. Later stages are visibly unavailable.

## Owned responsibility

Project store, local access guard, project route and shell.

Concrete files are assigned before dispatch. Preserve other workers' changes. Shared page wiring, schema changes, and lockfiles go through the coordinator.

## Acceptance criteria

- [ ] Project data and layout survive app restart.
- [ ] Writes are atomic; conflicting revisions from two tabs cannot silently overwrite data.
- [ ] Malformed records and failed writes preserve the last valid project and show an error.
- [ ] Server endpoints enforce local-only availability, validate write origins, and constrain filesystem access.

## Contract for downstream work

Project identity, revision-checked storage interface, stage mount points, and input revision semantics.

## Source and verification

Read the [spec](../../../specs/asset-workflow.md), [assignment contract](../README.md#shared-assignment-contract), [engineering evidence](../engineering-evidence.md), and [Graphite stack policy](../stack-workflow.md).

Consult these local pattern IDs, then read their owners and pinned sources before choosing APIs: validated-input, schema-evolution, runtime-boundary, configuration-boundaries.

Create, edit, reload, restart, conflicting writes, failed persistence, and public endpoint rejection.

Report which source behavior changed the implementation decision, or why a candidate did not fit. Read the installed Effect guidance and version-matched implementation and tests. A pattern name is not evidence of source lookup.

## Stack and completion

Use behavior dependencies above to decide readiness. Use the stack policy to choose the actual parent revision. A multi-dependency ticket cannot start on a base missing one prerequisite.

Keep this diff reviewable against its immediate Graphite parent. Checks run on its complete base plus change. Independent review, source evidence, and affected verification are required before acceptance.

No live generation, dependency installation, commit, dispatch, or publication is authorized by this draft.
