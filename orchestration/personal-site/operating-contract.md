# Supervised Gas City operating contract

Use this contract for the local personal-site workflow. Canonical decision `psbp-fzk` adopted supervised delivery on 2026-11-02. It supersedes the original autonomous-system qualification plan without claiming that the abandoned requirements passed. Repository instructions and later explicit user decisions still govern.

## Authority and live state

- Gas City owns worker execution and scheduling. Beads in `.tools/gascity-beads-pilot` owns task state, claims, decisions, attempts, deadlines and evidence. Pilot convoy `psbp-ftb` groups the existing work.
- The coordinator owns task contracts, worktree and resource reservations, model selection, independent review, verification, acceptance and serialized local integration onto `main`.
- Workers edit only their assigned paths in isolated worktrees. They preserve unrelated work, report exact candidates and checks, and cannot accept their own output or advance shared Git refs.
- Local integration is authorized within the approved task scope. Remote pushes, deployments, production writes, new dependencies and permission expansion require separate authorization.

Read current tasks through [reporting](reporting.md). Do not reconstruct live status from this document, an old plan checkbox, a session message or a closed task alone. A superseded qualification task is not a passing qualification.

## Capacity and budgets

The recorded cap amendment on convoy `psbp-ftb` permits at most **five concurrent Gas City worker/reviewer lanes plus the coordinator**. It supersedes the earlier three-lane cap. Browser verification workers count toward this ceiling. Use fewer lanes when work or resources do not justify five, and reserve capacity for review.

Each dispatch needs an existing task, explicit owned paths, an isolated worktree, dependency artifacts, a supported model and effort, acceptance checks, remaining attempts and an absolute deadline. The coordinator reserves shared files, ports and writable caches before launch. Scheduling dependencies do not imply Git ancestry.

Read budgets and any explicit amendments from the owning task and convoy before dispatch or recovery. Preserve original counters, deadlines and failed evidence. Restarts, new sessions, model changes and browser handoffs do not renew a budget. At exhaustion, preserve the candidate and report the remaining work. The coordinator supervises these limits; session age and checker timeouts do not establish unattended lifetime enforcement.

## Review and acceptance

Bind checks and independent review to the exact candidate commit and tree. The coordinator verifies against the current integration base and reruns affected checks after changes. Run `bun run verify` before delivery and `bun run verify:full` for build-affecting changes and before release, as required by `AGENTS.md`.

Use one independent reviewer for ordinary code and the required correctness, security and complexity reviews for sensitive changes. A successful build, worker completion statement or review of an earlier tree cannot replace missing acceptance evidence.

Follow [browser routing](browser-routing.md) for UI acceptance. CLI workers prepare an exact-candidate desktop handoff. Required desktop/mobile evidence remains pending until a desktop-hosted session performs the checks. Record notification delivery separately from the Beads handoff.

The supervised scope does not require a custom unattended recovery engine, automatic integration authority, crash-reconciliation engine or additional dispatcher/model-policy framework. Reintroducing those requirements needs a new explicit scope decision; their historical tasks must not be silently reopened or reported as implemented.

## Configuration and history

The [portable city template](city-template/README.md) versions reusable defaults. Copying or validating it does not update an active city, restore its tasks or authorize dispatch. Keep machine bindings, databases, caches, logs, worktrees and credentials outside Git. Preserve the active pilot and review its deployment differences before adopting template changes.

The original development city remains `.tools/gascity`; the development launcher and root `gascity.toml` target that separate setup. Use an explicit city path for pilot commands so discovery cannot select the development city.

The [original plan](../../docs/autonomous-development-plan.md) and [task contracts](../../docs/autonomous-development-tasks.md) retain qualification history. [Registry planning](planner.md) describes the existing import contract, not authority to repeat an import or add a scheduler. [Progress evidence](../../docs/autonomous-development-progress.md) records dated results; current Beads records remain authoritative for task status.
