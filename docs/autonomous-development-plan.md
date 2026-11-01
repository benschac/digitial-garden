# Deliver the local autonomous development pilot

Planning is approved; runtime implementation has not started. The coordinating agent owns this plan. Its scope is this repository, local execution, and local integration. The companion [task registry](autonomous-development-tasks.md) assigns executable units to parallel stacks.

## Use this plan

Treat this document as the standing execution contract. Check a task only when its recorded evidence exists. A proposal, agent completion message, or passing check on an earlier tree is not completion evidence.

The user authorized a durable plan, parallel agent stacks, model selection, and automatic landing of work that does not require their verification. This planning delivery does not launch the autonomous program. Start runtime implementation on an explicit instruction to execute this plan. Once started, do not ask again for routine local edits, tests, retries, worktrees, reviews, or eligible local integrations.

Use the PStack `playbooks/orchestrate.md` procedure as optional coordinator guidance. Gas City remains the execution and scheduling owner. Repository instructions and this authorization boundary take precedence over generic skill workflows. Do not add a second scheduler, hourly agent poller, mandatory PR per task, ten-agent review round, or human approval for every interaction change. Use proportional verification and the repository's independent review requirements.

## Arm the program

- [ ] P0. Record the approved clean base SHA, integration branch, task contract, evidence contract, resource ownership, and permission profile before dispatching writers.
- [ ] Read current repository instructions, installed versions, and the existing dirty diff. Preserve concurrent development and the Gas City development launcher.
- [ ] Create a dedicated integration worktree on `automation/personal-site-pilot`. Never use the user's active checkout as an integration workspace.
- [ ] Reserve up to two implementation workers and one read-only reviewer initially. Keep the coordinator available for reconciliation and decisions.
- [ ] In A1, select a compatible backend before initializing a disposable qualification store. A1 may initialize that isolated store and establish the canonical store after its checks pass. Preserve and back up existing state; existing-state migration remains a separate reviewed operation. Do not create a second independent database in each worktree.
- [ ] Import the task registry into the selected Beads store using stable external IDs. Record the resulting mapping. After import, Beads owns live statuses, attempts, dependencies, and decisions; Markdown remains the specification and import seed.
- [ ] Disable remote publication in the execution environment and keep production credentials out of workers. Worktrees isolate edits, not credentials or shared Git metadata.

P0 is a contract prerequisite, not a new orchestration framework. Record task ID, objective, owned paths, input artifacts, dependency kinds, acceptance commands, budget, model, escalation rules, and output commit. Use existing Gas City metadata and store fields where supported. Keep the native task status vocabulary and represent richer phases as metadata only when necessary.

Before the canonical store is ready, the existing coordinator runs P0, A1, and eligible parallel contract work. Persist their task IDs, attempts, decisions, and evidence under `.tools/gascity-bootstrap/`. D1 reconciles these records into Beads with stable IDs, including completed bootstrap results, then retires the bootstrap records from active use. This is a bounded bootstrap handoff, not a second live queue.

## Run the stacks independently

Each stack starts from the same approved integration base unless it consumes actual code from another stack. A scheduling dependency does not automatically create a Git parent. A stack owner may land a verified independent prefix before completing the entire stack.

| Stack | Owner responsibility | Can begin after | Git relationship |
| --- | --- | --- | --- |
| A | Native store, isolated workers, bounded recovery | P0 | Independent runtime branch |
| B | Trusted verification and evidence | P0 | Independent evidence branch |
| C | Deterministic local integration and reconciliation | P0 for design; B contract for implementation | Consume landed B code or stack only on the specific B commit used |
| D | Task decomposition, dependency dispatch, blocked decisions | P0 for contract work; A for runtime proof | Independent planner branch until runtime fixtures are required |
| E | Native reporting, model budgets, complete pilot evaluation | P0 for measurement definitions; A through D for final run | Independent reporting branch; final integration task consumes combined tree |

Use the companion registry for exact per-task prerequisites and acceptance evidence. Do not infer readiness from this summary table.

Start A and B in parallel. While runtime questions are investigated, the coordinator prepares D's contracts and E's measurement definitions. Start C when B's interface is stable. Run D's live dispatch experiment only after A proves worker isolation. Run the complete pilot after all required leaves pass.

Shared files such as `package.json`, `turbo.json`, `gascity.toml`, and `docs/standard-libraries.md` have one writer at a time. Stack owners propose changes to these files; the coordinator assigns the reservation and integrates them. Build outputs, worktree dependency directories, ports, and writable caches are resources too.

## Choose the model before dispatch

| Work | Initial model | Effort | Escalation |
| --- | --- | --- | --- |
| Inventory, documentation, mechanical edits against an approved example | `gpt-6-luna` | `medium` | Move to Sol after a substantive failure or ambiguity |
| Routine implementation and tests against established patterns | `gpt-6.1-sol` | `medium` | Increase to high after a substantive failure or unexpected boundary behavior |
| Boundary validation, unfamiliar formula wiring, nontrivial correctness | `gpt-6.1-sol` | `high` | Move to Astra for conflicting patterns or architectural failure |
| Integration races, permission boundaries, crash recovery, architectural contracts | `gpt-6-astra` | `high` | Increase effort for a specific unresolved question, not by default |
| Ordinary independent review | `gpt-6.1-sol` | `high` | Use Astra for sensitive integration or permission code |
| Formatting, tests, type checks, builds, graph validation | No model | Not applicable | Report deterministic failures to the task owner |

These identifiers and efforts were present in the local Codex catalog during the audit. Check support again at launch. Do not silently substitute an unavailable model. Record the fallback and keep the same authorization and attempt budget.

The user reaffirmed task-specific model and reasoning selection on 2026-11-01. The coordinating conversation does not determine worker settings: each dispatch records its own model and effort. Existing high-effort assignments in the task registry are initial ceilings; use medium for routine work once its contract and patterns are established. Do not duplicate a completed investigation merely to use another model.

These are capability assignments, not measured price claims. Record model, effort, input and output tokens, cache usage when available, elapsed time, retries, and accepted result. Show unknown price as unknown. Do not infer billed cost from cumulative usage snapshots or call a model cheaper without applicable pricing or measured billing.

Use at most three implementation attempts per task across restarts and model changes. Start with a configurable 30-minute task deadline and a 10-minute checker deadline. A timeout preserves artifacts and marks the task for diagnosis. A new loop ID must not reset the lifetime budget. Infrastructure retries have their own native limit and still count toward elapsed time. Stop repeated identical failures or unchanged failed acceptance evidence after two attempts. Git churn is not evidence of progress.

## Integrate eligible work without asking again

The coordinator owns integration. Workers produce candidate commits and evidence, and cannot grant their own merge authorization.

| Decision | Conditions | Action |
| --- | --- | --- |
| FAST_INTEGRATE | Reversible, scoped change; no unresolved dependencies; trusted checks pass; required independent review passes; current-base integration passes; no protected behavior changes | Integrate onto the designated local branch without a PR or another user question |
| STACKED_REVIEW | Existing behavior changes or dependent code needing combined verification; no unresolved human decision | Run independent review and combined checks, then integrate locally when they pass |
| HUMAN_REVIEW | New dependency authorization, destructive migration, credential or permission expansion, production write, major contract or product ambiguity | Preserve work and persist the concrete question; block only true dependents |
| REWORK | Acceptance failure, stale evidence, ownership violation, or actionable review finding | Return to the worker within its remaining budget |
| BLOCKED | Required input, resource, or authorization is unavailable | Persist the reason and continue unrelated work |

Documentation, isolated tests, and unreferenced modules can be early candidates. File count and lack of visible UI are not sufficient to qualify. Tooling or configuration that controls permissions, verification, or deployment is not a mechanical fast-path change.

Ordinary code gets one independent reviewer. Sensitive permissions, concurrent integration, and recovery code get three independent read-only reviews for correctness, security, and complexity. Skip agent review for trivial documentation unless the document changes authority. Reviewers receive the same candidate SHA and acceptance contract. Optional simplifications do not block landing.

Do not push remotely, deploy, alter branch protections, force-update shared history, delete shared infrastructure, or import a refinery workflow that does these actions. Local integration is not publication. A later explicit authorization can expand publication policy without treating this plan as that authorization.

## Bind acceptance to the integrated code

- [ ] Store task ID, attempt ID, specification revision, upstream contract revisions, original candidate commit and tree, expected integration base, resulting commit and tree, verifier revision, relevant toolchain and environment identity, check commands, exit codes, log locations, and reviewer verdicts.
- [ ] Load verification policy from the approved coordinator revision. A worker cannot edit the trusted gate or downgrade its checks through candidate metadata.
- [ ] Test the combined candidate in an integration worktree, then verify that no uncommitted tracked or relevant untracked files supplied missing code to the checks.
- [ ] Serialize integration and advance the target only if its previous tip still equals the recorded base. A changed base requires reconstruction and re-verification.
- [ ] Reconcile Git and Beads after a crash. If the recorded integration already exists, acknowledge it instead of creating another commit. Preserve original task-to-commit attribution.
- [ ] Reject failed, missing, stale, or partial verification. A successful descendant does not establish that every intermediate commit was buildable.
- [ ] Integrate only independently valid commits or an explicitly verified atomic batch. Use ordinary revert commits for rollback of shared changes.

Reuse Turbo caching, but make checks sensitive to formula, gate, policy, and toolchain inputs. Run focused acceptance checks during worker attempts. Run `bun run verify` at each delivered integration boundary. Use `bun run verify:full` for configuration or build changes and before release. Do not weaken repository checks to match the proposed tier labels.

Tests must reject stale evidence, concurrent base movement, duplicate delivery, integration-before-acknowledgement crashes, forbidden paths, and invalid dependency ordering. Live experiments must demonstrate actual worker dispatch, interruption recovery, bounded exhaustion, and independent progress while another task waits. Record durations as a baseline without claiming improvement. Do not add unrelated microbenchmarks or screenshot requirements to command-line tasks.

## Select and execute a real pilot

First qualify one task through execution, interruption, verification, and local integration. Then use a real feature with two independent implementation branches and at least one hard dependency. Do not manufacture ten tasks or install an unnecessary library.

Blog title and summary filtering is the proposed feature, not an approved UX contract. Before writing feature code, settle URL state versus browser-only state, server-rendered list behavior, keyboard behavior, empty results, draft visibility, and preservation of existing view transitions. Record a human question only if the answer changes product behavior and cannot be derived from established conventions.

Once the contract is accepted, implement matching logic and the accessible filter control independently. Integrate the page after both are verified. Runtime infrastructure work can continue while the product decision waits. Existing content ownership is under `apps/web/src/lib/content`; the list is in `apps/web/src/app/blog/page.tsx`.

## Observe and recover the program

Use Gas City status, ready queues, graph, events, costs, and dashboard before adding a custom view. Confirm actual coverage in E1. Record missing fields as gaps instead of promising a complete dashboard.

Persist decisions in Beads with the affected IDs, question, alternatives, recommendation, authorization needed, and answer revision. A task awaiting a decision does not stop unrelated ready tasks. On cancellation, stop dispatch, terminate owned processes, preserve worktrees and evidence, and release reservations only after their owners have stopped.

On restart, read this plan, Beads state, Git state, integration evidence, and active sessions. Reconcile before creating workers. Do not replay a side effect because an agent conversation disappeared. Back up the canonical store and prove a restore before calling the pilot durable. Keep runtime logs and generated state outside Git; retain concise evidence summaries with durable artifact locations.

Record interventions, time to first verified integration, total elapsed time, retry count, verification minutes, usage, unknown costs, rework, and failures. Compare against an equivalent manual task only after observing both. The throughput target does not justify empty commits or further decomposition.

## Close the pilot

- [ ] A task starts without manual agent interaction and runs in its assigned worktree.
- [ ] An interrupted task resumes without losing durable evidence or duplicating integration.
- [ ] Failed work terminates within its attempt and elapsed-time budgets.
- [ ] Two independent tasks overlap in execution; a hard dependent remains blocked until its prerequisite passes.
- [ ] A human-blocked task leaves unrelated work running.
- [ ] Eligible work integrates locally without a PR or user confirmation, while protected work cannot bypass its gate.
- [ ] An operator can inspect planned, ready, running, verified, integrated, blocked, failed, and next work, with check evidence and available usage data.
- [ ] Full verification passes at the final combined tree. Record remaining runtime or product limitations explicitly.

## Appendix A. Audit evidence and unresolved experiments

The read-only audit found Gas City 1.5.1, Beads 1.3.2, and Codex CLI 0.166.0. Existing configuration uses a file store and disables agent-hook installation. These facts are a dated starting point, not proof of launch or recovery.

Gas City v2 supplies native `check` attempts, retry controls, and graph dispatch. `gc converge` rejects v2 formulas. Dependencies on parent steps do not wait on all children. Unknown formula keys can be silently ignored. Validate compiled dependencies and failure behavior, not just TOML parsing.

Fresh Codex contexts per attempt, hook delivery, native dashboard coverage, and secure unattended execution remain unproven. Configuration validation attempted a write to the global Gas City cache lock and was blocked by the planning sandbox. No repair was attempted.

The installed Dolt directory was 2.6.1, while Beads 1.3.2 documentation names 2.2.0 for its standalone server. Verify compatibility before selecting server mode. Do not downgrade or migrate an existing database automatically. The existing file store does not satisfy the Beads requirement by name alone.

The repository already has affected checks, stacked CI selection, and preview skipping. The Vercel script does not establish independent production release control. Keep the pilot local. There is no measured speed or cost improvement yet.

## Appendix B. Alternatives deferred

Defer external Ralph unless a fresh-context experiment demonstrates a native gap. If needed, add a one-attempt adapter under Gas City's budget, not a second retry owner. Defer custom dashboards, automatic price optimization, custom stack machinery, and multi-project support until a working pilot identifies a concrete deficiency.

The generic PStack multi-phase template assumes PRs, ten live verification lanes per PR, and blanket performance gates. This plan deliberately uses proportional checks and local integration to follow the user's request and repository rules. Its template checker is not a semantic validator for this adapted plan. Validate dependency consistency, ownership, authorization boundaries, and evidence requirements directly.

## Appendix C. Read before implementation

- [Repository instructions](../AGENTS.md), [standard libraries](standard-libraries.md), and [source lookup workflow](../agent-patterns/README.md).
- [Gas City 1.5.1 formula v2 contract](https://github.com/gastownhall/gascity/blob/v1.5.1/docs/reference/specs/formula-spec-v2.md).
- [Gas City 1.5.1 built-in packs](https://github.com/gastownhall/gascity/blob/v1.5.1/docs/reference/system-packs.md).
- [Gas City verification dispatcher](https://github.com/gastownhall/gascity/blob/v1.5.1/internal/dispatch/ralph.go).
- [Beads 1.3.2 storage guidance](https://github.com/gastownhall/beads/blob/v1.3.2/docs/architecture/dolt.md).
- Installed `codex exec --help`, provider configuration, and the local model catalog. Verify supported settings again before launching workers.

Before implementing Effect, XState, or a custom resource adapter, read the installed instructions and matching source and tests through the repository workflow. Keep Gas City responsible for processes and retries wherever it already suffices.
