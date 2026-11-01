# Execute the autonomous development stacks

Use the [execution plan](autonomous-development-plan.md) for authorization, evidence, integration policy, and stop conditions. This file seeds the task graph. It does not claim the tasks have been dispatched or completed.

## Establish task ownership

- [ ] P0. The coordinator freezes the approved base SHA, assigns one worktree and branch per owner, and settles the task, verification, and integration interfaces before implementation. Record allowed paths, verifier identity, dependency artifact IDs, attempt budget, and integration target. Use `gpt-6-astra` at `high` effort for this contract decision. The evidence is an agreed contract and a clean base, not this unchecked box.

This table is the original work contract; runtime evidence and task state live in Beads. The qualification progress report records which portions have actually run. Hard dependencies require completed artifacts. Contract dependencies allow implementation against P0 interfaces before providers exist. Git parents describe code ancestry, not scheduling. A task can become ready before its stack predecessor finishes when it needs no predecessor code.

After A1 proves the selected Beads backend, D1 imports these IDs into Beads exactly once and records their Beads IDs. Beads then owns status, claims, blockers, attempts, and evidence. Keep this file as the versioned execution contract; do not maintain a competing live queue here. Reconcile existing IDs before retrying an import.

Until that import, the existing coordinator records P0, A1, and eligible contract work under `.tools/gascity-bootstrap/` with stable task IDs and evidence. A1 first selects a supported backend, then initializes a disposable qualification store and establishes the canonical store after successful checks. It must not migrate existing state without a separately reviewed migration. D1 imports completed bootstrap outcomes as well as pending tasks.

## Assign five owners

| Stack | Owner responsibility | Proposed branch | Files exclusively owned |
| --- | --- | --- | --- |
| A | Runtime, store, isolation, recovery | `orchestrator/runtime` | `gascity.toml`, `orchestration/personal-site/pack.toml`, runtime agent definitions, `orchestration/personal-site/formulas/worker.toml`, runtime qualification artifacts |
| B | Evidence and trusted verification | `orchestrator/verification` | `scripts/orchestrator-verify.*`, evidence contract fixtures and verifier tests |
| C | Local integration and reconciliation | `orchestrator/integration` | `scripts/orchestrator-integrate.*`, integration tests and disposable Git fixtures |
| D | Planning and native dispatch | `orchestrator/planning` | Planner prompt, `orchestration/personal-site/formulas/feature.toml`, task import adapter only if native commands are insufficient, graph fixtures |
| E | Reporting, model policy, acceptance | `orchestrator/operations` | Reporting configuration, model routing configuration, operational acceptance scenarios and results |

The coordinator alone owns shared edits to `package.json`, `turbo.json`, `README.md`, and the primary plan. Owners send exact requested edits instead of racing on those files. Existing unrelated edits remain untouched. Final file extensions follow the repository's installed tooling and source lookup requirements.

All stacks begin at P0's frozen base. Within each stack, use the predecessor as a Git parent only when its implementation is required. Cross-stack code dependencies are imported through an integrated contract commit or an explicit temporary parent, recorded before dispatch. Never create a Git stack merely because tasks share this document.

## Execute stack A

| Task | Work and acceptance | Dependencies | Model | Verification and lane |
| --- | --- | --- | --- | --- |
| A1 | Qualify the existing city and a supported Beads backend. Preserve existing state. Record exact CLI and pack versions, storage mode, schema compatibility, backup and restore procedure. Establish one canonical store before importing tasks. | Hard P0. No Git parent beyond base. | `gpt-6.1-sol`, `high` | Validate composed configuration and perform isolated create, read, restart, and restore checks. Automated review lane. Escalate any destructive migration or unsupported compatibility choice. |
| A2 | Prove one task reaches a Codex worker in its owned worktree. Verify bootstrap, hook delivery or explicit work loading, noninteractive behavior, permissions, cancellation, and output capture. No worker may write the authoritative checkout or push. | Hard A1. Contract P0. Git parent A1 if configuration is reused. | `gpt-6.1-sol`, `high` | Drive the real CLI with a disposable task. Capture worktree provenance, session ID, candidate SHA, and denied-action behavior. Automated review lane. |
| A3 | Implement native bounded execution and prove interruption recovery. Use v2 `check` with three total implementation attempts and a lifetime elapsed-time budget. Measure whether iterations reset context before considering an adapter. | Hard A2 and B2 for trusted completion. Contract P0. Git parent A2. | `gpt-6-astra`, `high` | Force failed verification, process termination, retry exhaustion, and stalled progress. Recovery preserves identity and remaining budget. No external Ralph runner without a demonstrated gap. Automated review lane. |

## Execute stack B

| Task | Work and acceptance | Dependencies | Model | Verification and lane |
| --- | --- | --- | --- | --- |
| B1 | Define and validate immutable evidence records. Bind task and attempt identity, candidate commit and tree, base SHA, command, exit status, toolchain, verifier version, and artifact references. Reject missing or mismatched identity. | Hard P0. No runtime prerequisite. Git base P0. | `gpt-6.1-sol`, `high` | Focused valid and invalid record fixtures. An unreferenced contract module may use the local fast lane after required checks and review. |
| B2 | Connect existing repository verification to the trusted gate. Load verifier policy from the approved control revision, not the candidate. Preserve logs and distinguish test failure from infrastructure failure. | Hard B1. Contract P0. Git parent B1. | `gpt-6.1-sol`, `high` | Run known passing and failing candidates. A candidate that edits its verifier cannot authorize itself. Bind evidence to the actual resulting tree. Automated review lane. |
| B3 | Add the regression checks that reject stale evidence and changed acceptance rules. Wire owned tooling inputs into existing verification through coordinator edits. | Hard B2. Git parent B2. | `gpt-6.1-sol`, `high` | Rebase, changed base, changed verifier, and modified tracked files invalidate acceptance. Run relevant tests and repository gates. Automated review lane. |

### B1 execution refinement

The first executable leaf, B1a, is the pure identity validator in `scripts/orchestrator-evidence.mjs` and its focused tests. It rejects missing task/attempt fields, mismatched candidate/base/verifier identities, malformed checks and nonzero exits. It does not authenticate the producer, require a particular check set, prove a Git object exists, or grant integration permission.

B1b remains necessary before the parent B1 contract is complete: bind the expected attempt, command arguments, toolchain identity and artifact references in the persisted receipt. B2 must then load trusted commands and check requirements from the approved verifier revision. Do not close the parent or dispatch its hard dependents merely because B1a passes.

## Execute stack C

| Task | Work and acceptance | Dependencies | Model | Verification and lane |
| --- | --- | --- | --- | --- |
| C1 | Define deterministic lane decisions from P0 restrictions. Fail closed on missing evidence, unresolved blockers, forbidden paths, or unauthorized actions. Model recommendations may escalate but never weaken restrictions. | Hard P0. Contract B1 schema can be agreed before B1 code. Git base P0 unless B1 is imported. | `gpt-6-astra`, `high` | Table-driven decisions include every mandatory restriction and unknown input. Automated review lane. Policy author cannot self-approve broader permissions. |
| C2 | Implement one local integration authority only if native tooling cannot satisfy the contract. Prepare against current target, verify, and atomically advance only the expected target tip. Preserve task attribution and reject conflicts. | Hard C1, B2, and A2. Git parent C1 plus explicit imports of required B code. | `gpt-6-astra`, `high` | Disposable repositories demonstrate successful integration, moved target rejection, serialization, and refusal to push or rewrite public history. Automated review lane with independent correctness, security, and complexity reviews. |
| C3 | Reconcile the crash window between Git advancement and Beads acknowledgement. Retried integration must not duplicate commits. Document local rollback and preserve failed work. | Hard C2 and A1. Git parent C2. | `gpt-6-astra`, `high` | Inject termination before and after target advancement and acknowledgement. Resume twice and prove one integration. Test ordinary revert recovery. Same independent review requirements as C2. |

## Execute stack D

| Task | Work and acceptance | Dependencies | Model | Verification and lane |
| --- | --- | --- | --- | --- |
| D1 | Produce scoped tasks from a specification using existing patterns. Import this registry into the qualified Beads store with stable external IDs. Preserve completed work during reconciliation. | Contract P0 permits prompt and fixture work immediately. Hard A1 for import. Git base P0. | `gpt-6.1-sol`, `high` | Re-import creates no duplicates. Every task has ownership, acceptance, checks, budget, and dependency artifacts. No scheduler is introduced. Automated review lane. |
| D2 | Express hard and contract prerequisites with native v2 steps. Keep integration ordering and resource conflicts distinct. Validate cycles and compiled dependencies before dispatch. | Hard D1 for live import, A2 for live workers. Contract P0 allows early graph fixtures. Git parent D1. | `gpt-6.1-sol`, `high` | Two independent tasks overlap; a hard dependent waits; a contract consumer starts after contract approval. Explicit leaf dependencies gate joins. Unknown or omitted edges fail graph assertions. Automated review lane. |
| D3 | Persist a decision and block only its true dependents. Resume after an answer without duplicating work. Refine only affected graph portions and reject prerequisites retroactively invalidating completed work. | Hard D2. Git parent D2. | `gpt-6.1-sol`, `high` | One branch awaits a decision while another completes. Cycle insertion and changed contract revision are rejected or explicitly invalidate downstream evidence. Automated review lane. |

## Execute stack E

| Task | Work and acceptance | Dependencies | Model | Verification and lane |
| --- | --- | --- | --- | --- |
| E1 | Configure native status and reporting. Show ready, running, blocked, failed, integration-ready, integrated, and pending-publication work with evidence links. Document unavailable native views before adding anything. | Contract P0 allows report design. Hard A1 and B1 for live records. Git base P0. | `gpt-6-luna`, `medium` | Reconstruct status after restart without conversation history. Missing evidence remains visibly missing. Documentation may use the local fast lane; executable wiring requires automated review. |
| E2 | Add explicit model assignments and budgets. Validate model identifiers against installed Codex. Record input, output, cache usage when exposed, latency, attempts, and cost provenance. Escalate repeated nontrivial failure within the same lifetime budget. | Hard P0 for policy, A2 for runtime validation. Git base P0; parent E1 only if its reporting code is reused. | `gpt-6.1-sol`, `high` | Unsupported settings fail visibly. Model escalation never resets attempts. Unknown billing cost is reported as unknown, not inferred from token totals. Automated review lane. |
| E3 | Run the complete acceptance exercise and record measured outcomes. Select the real website pilot separately from infrastructure qualification. Blog filtering is a candidate, not an approved feature. | Hard A3, B3, C3, D3, E1, E2, and approved pilot behavior. Git parent is the verified combined integration tip. | `gpt-6.1-sol`, `high` | Demonstrate parallel progress, blocked branch, bounded failure, restart, exact-tree integration, duplicate rejection, and no publication. Run final repository gates and required browser checks for a UI pilot. Record limitations and human interventions. Automated review; unresolved product decisions remain human-gated. |

## Dispatch in waves

1. Complete P0. A1, B1, C1 policy design, D1 prompt and fixture design, and E1 report design can then proceed independently.
2. Run A2 alongside B2 and B3. Complete C1 tests against the settled evidence contract. Prepare D2 graph fixtures and E2 model policy.
3. Run A3, C2, D2 live checks, and E1 reporting as their hard dependencies finish. Do not wait for unrelated stacks.
4. Run C3 and D3 independently. Finish E2 runtime checks.
5. Run E3 against the combined verified tree. Keep publication separate.

These waves describe eligibility, not a requirement to start five agents at once. The coordinator reserves capacity for integration and review. Start with two coding workers after A2 passes and increase only when measurements justify it.

## Hand off one task

Copy this prompt and replace every bracketed field before dispatch.

```text
Execute task [ID] from docs/autonomous-development-tasks.md.
Read docs/autonomous-development-plan.md and all applicable AGENTS.md files.
Objective: [task outcome].
Your worktree is [absolute path], branch [branch], base [SHA].
You own only [explicit paths]. You are not alone; preserve other agents' work.
Required artifacts are [IDs, revisions, and locations].
Acceptance is [observable predicates]. Run [exact verification commands].
Use [supported model] with [supported effort].
Remaining lifetime budget is [attempts and deadline].
Do not publish, deploy, weaken checks, change permissions, or mutate shared refs.
Use the canonical Beads task [ID] for progress and blockers.
Before D1 import, use the coordinator's bootstrap record [path and stable ID] instead.
If a dependency changes, stop dependent work and record the affected evidence.
Return candidate SHA and tree, checks and logs, review needs, and next action.
Do not claim integration. Only the coordinator records integrated state.
```

## Preserve the known compatibility constraints

The initial audit found Gas City 1.5.1, Beads 1.3.2, and Codex CLI 0.166.0. Recheck before execution. The current city uses a file-backed provider. A standalone Dolt 2.6.1 installation directory was present, while Beads 1.3.2 documents a 2.2.0 pin. Compatibility remains unproven.

Gas City v2 `check` owns implementation convergence. `gc converge` accepts v1 formulas in the audited release. A new iteration bead does not prove fresh Codex context. A dependency on a parent does not establish completion of its children. Explicitly test these behaviors using the installed release and its pinned source before relying on them.

Use the sources and evidence limits in the primary plan. No task is complete because its agent says so, and no model assignment here claims measured cost savings.
