# Native task reporting

The current supervised scope is recorded in decision `psbp-fzk`. Tasks marked `pilot.phase=superseded_by_supervised_scope` were intentionally retired; their closed status does not mean their original acceptance checks passed.

Beads is the live task record. Reconstruct state after restart from the canonical city; do not infer completion from a session, branch, or worker message. `docs/autonomous-development-tasks.md` remains the specification. `orchestration/personal-site/planner.md` describes registry and contract fields.

## Read the live queue

Select the canonical city explicitly. In this workspace, directory discovery can select the original city even from the pilot directory. These commands do not change task state:

```sh
gc --city .tools/gascity-beads-pilot status --json
gc --city .tools/gascity-beads-pilot bd status --json
gc --city .tools/gascity-beads-pilot bd ready --json
gc --city .tools/gascity-beads-pilot bd blocked --json
gc --city .tools/gascity-beads-pilot bd list --all --limit 0 --flat --json
gc --city .tools/gascity-beads-pilot bd show TASK_ID --json
gc --city .tools/gascity-beads-pilot bd comments TASK_ID
```

Use `gc --city .tools/gascity-beads-pilot convoy status psbp-ftb` for the complete 18-task pilot initiative. This owned convoy targets local `main` with local merge policy; it does not authorize publication.

Use `gc status` for city health, running agents, and rigs; `gc bd status` for issue counts and database activity; `ready` for dependency-unblocked claimable work; `blocked` and `list` for the broader queue; and `show` for the task's contract, dependencies, claim/lease, and metadata. `ready` is a view, not a stored status. Use `gc bd list --all --limit 0 --flat --json` to avoid the default row limit; filter canonical tasks by `external_ref` beginning `orchestrator-`. Do not treat ephemeral review/session wisps as canonical tasks.

Beads has stored statuses `open`, `in_progress`, `blocked`, `deferred`, and `closed`. The pilot additionally uses `pilot.phase` metadata. Interpret the combination as follows:

| Reported state | Native evidence and interpretation |
| --- | --- |
| Planned | `open` with no `pilot.phase`; this means not yet claimed, not necessarily ready. |
| Ready | Present in `gc bd ready`; readiness reflects current dependencies and deferrals, not contract approval or resource reservation. |
| Running | `in_progress`, with the current `assignee`, heartbeat/lease and `pilot.attempt` checked in `show`. |
| Blocked | Native `blocked` status and dependency details. A decision or external wait may also be recorded in phase/notes; name its actual scope rather than blocking unrelated work. |
| Rework | `pilot.phase: rework`; inspect review findings and the remaining attempt/deadline before another dispatch. |
| Failed | No dedicated native failed status was found. Report a failed check or exhausted attempt only when its command/result and attempt are recorded in durable task notes or linked evidence; keep the Beads status visible. |
| Verified | No dedicated verified status was found. Use only when the accepted verification receipt identifies the exact candidate tree, checks, exit results, verifier, and artifacts. A worker's claim or a prior-tree pass is insufficient. |
| Integration-ready | `pilot.phase: integration_ready` marks a candidate handed to the coordinator; it does not mean accepted or integrated. |
| Integrated | `pilot.phase: integrated` plus `pilot.integrated_commit` identifies the locally accepted commit. Confirm the commit and ancestry in the repository before reporting it as integrated. |
| Pending publication | Inferred when work is integrated and no publication receipt is recorded. Publication is outside this local pilot; do not imply it occurred. |

Missing phase, receipt, commit, or publication evidence stays missing in the report. A phase label alone is not proof of its associated artifact. Native list/show and comments can expose recorded metadata and notes, but the CLI does not render a complete evidence dashboard or these derived lifecycle queues.

## Monitor the pilot without the retained-history scan

Gas City 1.5.1 can report `store health: counting retained bead rows: hydrating list fallback: list timed out` on the proxied Beads backend. Its full status read falls back to loading retained history within a one-second deadline. A partial result also marks non-running agents unknown; that warning alone does not prove their sessions failed. The owning paths are [store-health counting](https://github.com/gastownhall/gascity/blob/v1.5.1/internal/api/store_health.go) and [status rendering](https://github.com/gastownhall/gascity/blob/v1.5.1/cmd/gc/city_status_snapshot.go).

For fleet monitoring, use the supported [lightweight status API](https://github.com/gastownhall/gascity/blob/v1.5.1/internal/api/handler_status.go). The local supervisor was verified on port 8372. Check `gc doctor --check supervisor-http-api` if that endpoint changes.

```sh
status_json=$(curl --fail --silent --show-error --max-time 10 \
  'http://127.0.0.1:8372/v0/city/personal-site-beads-pilot/status?lite=true&index=0&wait=1ms') &&
  printf '%s\n' "$status_json" | jq -e '
    if .name != "personal-site-beads-pilot" then error("unexpected city")
    elif .partial == true then error((.partial_errors // ["partial status"]) | join("; "))
    else {name, path, agents, suspended}
    end'
```

The index query bypasses the response cache, but the underlying store snapshot can still lag. Lite mode omits retained-store health, detailed session counts, and work-count reads. Its zero-valued work fields are not queue evidence. Continue using `gc bd status --json` and task-specific reads for the queue, and `gc doctor --json` for diagnostics. This monitoring path does not repair the full `gc status` command or establish task acceptance.

## Interpret the restricted provider warning

The pilot's `a2-continuation` agent uses `pilot-restricted-exec` with `wake_mode = "fresh"`. Gas City deliberately clears the conversation key on [fresh wake](https://github.com/gastownhall/gascity/blob/v1.5.1/internal/session/lifecycle_transition.go). The [provider-parity check](https://github.com/gastownhall/gascity/blob/v1.5.1/internal/doctor/checks_provider_parity.go) warns about missing resume fields without considering that policy.

Keep fresh wake and the restricted launch arguments intact. Do not add a dummy resume flag or inherit a different provider merely to silence the warning. A future resumable provider needs separate verification that it captures the real Codex thread ID and preserves every restriction on resume.

## Preserve evidence and usage

Record concise progress and durable evidence locations on the owning bead, for example:

```sh
gc bd update TASK_ID --append-notes 'Check: bun run verify; exit 0. Candidate tree: <tree>. Evidence: <repository-relative path or artifact ID>. Limitation: <unknown or not checked>.'
gc bd show TASK_ID --json
```

Keep command arguments, result/exit status, candidate identity, and evidence path or artifact ID together. Do not replace a missing receipt with a summary sentence. The task's stable `external_ref` is `orchestrator-<ID>`; `orchestrator.contract` is the approved specification, while live status, attempts, notes, and `pilot.*` fields are native-owned.

For usage, `gc costs --json` summarizes locally recorded per-run usage facts and may include token totals, wall time, and list-price estimates. Check its source/provider coverage: forwarded or discarded usage is not shown locally, unpriced runs are excluded from the cost total, and an estimate is not an authoritative charge. Report unavailable input/output/cache tokens, latency, or cost as unknown; do not derive billing cost from tokens. `gc analyze reliability --json` is a separate read-only session-lifecycle report, not task completion evidence. Neither report establishes task correctness or end-to-end pilot performance.

## Live-view limits observed

At inspection, `gc status --json` exposed city health, agent running/suspended state, controller/workspace and summary fields; `gc bd ready`, `blocked`, `list`, `show`, and comments exposed task state/dependencies/metadata. The current CLI help lists `gc costs` and `gc analyze reliability`; it did not expose a native task report for failed, verified, integrated, pending-publication, or evidence-linked lifecycle views. Use the commands and interpretation above rather than claiming a full dashboard, custom scheduler, or native semantic states that the store does not supply.
