# Preparation handoffs

Prepared on 2026-11-01. These are implementation contracts for later work, not completed C1/D1/D2 tasks. Live task state remains in Beads. The user subsequently directed B1b to run on `main`; one coding worker owns only its evidence module and tests. Preserve historical worktree evidence.

## C1: deterministic integration decisions

Implement a pure `decideIntegration(trustedContext, modelRecommendation?)` in `scripts/orchestrator-integrate.mjs`, with table-driven tests alongside it. No commands, ref advancement, permission changes or Beads writes belong in C1.

The trusted context must distinguish coordinator policy, task/specification/dependency revisions, candidate and resulting commit/tree, current and expected base, actual changed paths, verification provenance, independent reviews and risk classification. B1b validates receipt bindings; B2 supplies trusted execution and policy. A valid receipt alone cannot establish check execution or authorization.

Return the existing lane vocabulary, `readyForIntegration`, stable ordered reason codes and required review roles. Evaluate all predicates and preserve every failure. Proposed precedence:

1. `BLOCKED`: missing/malformed trusted input, unknown classification, missing evidence, unresolved prerequisite/resource, infrastructure failure or explicitly prohibited action.
2. `HUMAN_REVIEW`: otherwise well-formed proposal needs dependency, destructive migration, credential/permission or production-write authorization, or a material product/contract decision.
3. `REWORK`: stale or failed acceptance, ownership violation, contaminated verification workspace or actionable review findings.
4. `STACKED_REVIEW`: mandatory evidence passes, but behavior changes, dependent code needs combined checks, or verification/permission/deployment controls change.
5. `FAST_INTEGRATE`: every mandatory gate passes for a reversible, scoped, independently valid change without protected behavior changes.

Only the last two can be eligible, after all required checks and reviews. Missing review is blocked. Model recommendations may only escalate; they cannot remove reasons or reduce required reviews. Unknown recommendations fail closed. Explicitly prohibited operations and proposals to expand authorization both remain ineligible.

Mandatory predicates include exact owned/forbidden path matching, both rename endpoints, traversal rejection, current task/attempt/specification/dependency/verifier identity, trusted check set, artifact/log bindings, clean verification inputs, and independently valid commits or an explicitly verified atomic batch. Require `verify`, plus `verify:full` for build/configuration changes. Ordinary code needs one independent reviewer; sensitive permissions, concurrent integration and recovery need three distinct correctness/security/complexity reviewers. Trivial documentation may omit review only when authority is unchanged. C2 must still serialize and recheck the target at ref advancement; C1's snapshot cannot prevent a later race.

Tests: complete FAST and STACKED successes; every missing/unknown field; each forbidden action; each authorization expansion; missing B2 provenance despite valid B1b; stale identities individually; changed argv/toolchain/artifact; missing check/log/review/dependency; infra versus test failure; ownership additions/deletions/renames; absolute/traversal/prefix-collision paths; duplicate/self/wrong-tree reviewers; optional suggestions; dirty inputs, moved tip and partial batch; model attempted downgrades; simultaneous failures with fixed precedence; frozen inputs and repeatability.

Before live wiring, coordinator must supply a versioned policy with owned/protected paths, target, permission and verifier rules. Legacy `.tools/gascity-bootstrap/P0.json` is receipt-only qualification evidence, not that policy. No new permission is authorized by this handoff. Review the final precedence and policy contract before implementing; source lookup and three independent reviews apply to permission-sensitive implementation.

## D1–D2: native import and dispatch

Use the canonical `.tools/gascity-beads-pilot` store. Preserve existing external references: `orchestrator-B1` → `psbp-ix9`, `orchestrator-B1a` → `psbp-yvt`, `orchestrator-B1b` → `psbp-ix9.1`. Preserve B1a closure and publication/integration metadata, including its recorded published commit `8c5d2681d5aeb2432f97020baa9b59bb8d2bd14f`.

Reserve one coordinator importer. Query all states by exact `orchestrator-<ID>` external reference. Zero matches permits creation; one permits compatible contract reconciliation; multiple matches fail visibly. Never reset status, claims, attempts, notes, revisions or completed evidence. Resolve all IDs before wiring dependencies, assert the entire edge set and check cycles. Import bootstrap outcomes and B1 leaves. Qualify two imports in a disposable store with identical IDs/counts and preserved closed evidence. Query-before-create is not proven atomic uniqueness; concurrent importers remain prohibited pending qualification.

Useful read commands:

```sh
gc --city .tools/gascity-beads-pilot bd list --all --limit 0 --external-ref orchestrator-B1 --json
gc --city .tools/gascity-beads-pilot bd dep list psbp-ix9.1 --json
gc --city .tools/gascity-beads-pilot bd dep cycles --json
```

The managed proxy refuses `bd --readonly`; use ordinary read commands. Native CLI may require scoped access to its global cache lock.

Express hard prerequisites with native v2 `needs`/`depends_on`. Represent approved contracts as separate revision-bound artifacts, allowing consumers to depend on approval rather than unfinished implementation. Keep Git ancestry, integration ordering and resource reservations separate. Joins name explicit leaves; a parent grouping does not establish child completion. B1b currently has a parent-child edge to B1 and a blocking prerequisite on B1a; adding B1 itself as a blocking prerequisite would deadlock completion.

Gas City v1.5.1's formula specification documents cycle/unknown-target rejection. Unknown keys can disappear, so assert exact compiled nodes and edges. Before future dispatch, inspect `formula show feature --json` and `sling worker TASK_ID --on feature --dry-run --json` once that formula exists. Live parallel behavior remains unqualified. Do not use `mol-polecat-work` with its push/refinery lifecycle for this local-only pilot.

D owns planner prompt, feature formula and import/graph fixtures. A owns runtime/worker configuration. Coordinator owns shared configuration, dependencies and integration. Native sling does not reserve a filesystem: never send two writers to the same directory. D2's two-writer overlap experiment is deferred; this session authorizes one coding worker and read-only preparation lanes.

The preparation lanes inspected current native records/help and the pinned v1.5.1 formula specification. Atomic import uniqueness, retry semantics and live D2 dispatch acceptance remain to be demonstrated. No queue or permission mutations were performed by these lanes.
