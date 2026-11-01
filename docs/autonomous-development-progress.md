# Gas City bootstrap evidence

The first local qualification ran on 2026-11-01 from base `ad1cc29861b6ad849bcd8a55bea6eb7e4928f100`. Gas City launched the workers; native Codex subagents were not used for execution. The implementation program is incomplete. No source change, remote push, deployment, or autonomous integration occurred.

## Verified results

| Probe | Result | Evidence |
| --- | --- | --- |
| Existing city configuration | Passed native validation | `gc --city .tools/gascity config show --validate` |
| Isolated integration branch | Created from the recorded base | `automation/personal-site-pilot`, `.tools/gascity-worktrees/integration` |
| Isolated worker | Gas City dispatched task `gc-64` to session `gc-73` | `.tools/gascity-worktrees/worker-one`, branch `automation/pilot-worker-one` |
| Initial receipt | Worktree, HEAD, and plan hash matched the expected values | Initial transcript and coordinator inspection; the later restart overwrote this receipt |
| Beads persistence | Created `qualify-0ue` and read it from a separate CLI process | `.tools/beads-qualification`, embedded Beads 1.3.2 |
| Beads backup and restore | Dolt-native backup restored into a separate initialized disposable database; bead ID and revision survived | `.tools/beads-qualification-backup`, `.tools/beads-restore-qualification` |
| Fresh worker continuation | Task `gc-101`, session `gc-102`, read the preserved artifact and produced strict valid JSON | `.tools/gascity-bootstrap/A2-recovery.json` |
| Coordinator acceptance | Checked current HEAD, original artifact hash, preserved bytes, strict JSON outcome, and absence of tracked source changes | Recovery record and `.tools/qualification-recovery.json` in the worker worktree |

The first worker used `gpt-6-luna` with `medium` effort. After the invalid replay output, the bounded recovery worker used `gpt-6.1-sol` with `high` effort. Both used the existing workspace sandbox and on-request approval configuration. Neither requested permission expansion. No measured billing comparison is available.

## Failed and limited probes

The controlled suspend and wake experiment did not prove session recovery. Gas City reported that the pool session had no current wake reason. A subsequent submit reported a missing provider session key and a closed session. A fresh provider invocation nevertheless rewrote the original receipt, changed its session ID, and left a literal backslash-n after the JSON document. The coordinator's strict JSON parser rejected it.

This is a failed qualification, not a demonstrated upstream defect. The smoke worker used `wake_mode = "fresh"` and intentionally did not claim or acknowledge tasks through `gc hook` or `bd`. Its restricted prompt tested launch and artifact production only. Qualify the complete native work protocol before attributing these outcomes to Gas City recovery behavior.

The recovery worker preserved the malformed bytes and reported `original_valid_json = false`. Its artifact hash matched the archived original. This proves continuation from files in a fresh Gas City session. It does not prove automatic crash recovery, retry exhaustion, verified integration, or stable task acknowledgement.

Gas City generated `.codex/hooks.json` in the worker worktree despite the workspace's empty `install_agent_hooks` setting. The coordinator detected that untracked file separately from worker output. No tracked source was changed. Do not infer that the workspace setting disables all managed session hooks.

Targeted native diagnostics reported provider parity as passing and one managed city Codex hook file needing upgrade. No repair or city-wide restart was performed. Hook drift has not been established as the cause of the failed resume.

The running city still uses the file provider. `gc bd` refused that backend. Embedded Beads backup success does not qualify Gas City's server integration or concurrent writers. Existing city state was not migrated. A1, A2, and A3 remain incomplete under the execution plan.

## Current durable state

- The existing mayor remains running and was not restarted.
- `pilot-worker` and `pilot-recovery` templates are suspended. The recovery session was explicitly suspended after completion.
- Native work beads `gc-64` and `gc-101` retain `pilot.result` metadata written through exact-store compare-and-set. They are not marked integrated or complete.
- `.tools/gascity-bootstrap/P0.json` records the base, worktree, one-worker limit, and local-only authority.
- `.tools/gascity-bootstrap/A1.json` records the embedded store qualification and its limits.
- `.tools/gascity-bootstrap/A2-status.json` records the failed recovery outcome.
- `.tools/gascity-bootstrap/A2-receipt-after-failed-resume.bin` preserves the malformed artifact.
- `.tools/gascity-bootstrap/A2-recovery.json` records independently checked fresh-session output.

These ignored files persist locally across agent restarts, but are not an off-machine backup. The versioned report preserves conclusions if the local experiment directories are unavailable. Beads remains a pending canonical-store qualification, not a completed migration.

## Continue qualification

1. Re-read the execution plan and inspect current city state before resuming either pilot template. Keep the failed evidence intact.
2. Qualify the supported Gas City Beads provider in a separate city or disposable backend. Resolve standalone Dolt compatibility before changing the existing store.
3. Inspect the installed managed Codex hook lifecycle and its matching source. Upgrade only the relevant managed hook through a targeted native operation if the evidence requires it.
4. Run a new bounded task with actual native claim, progress, and acknowledgement. Use unique attempt artifacts and trusted strict validation before accepting completion.
5. Test forced interruption during that task, then show preserved task identity and attempt budget through recovery. Test exhaustion separately from successful artifact production.
6. Enable two workers only after isolation, protocol completion, and bounded recovery pass. Keep local integration gated on stack B and C evidence.

No new user decision is needed for these already-authorized local qualification steps. Broader credentials, destructive migration, remote publication, and deployment remain outside the pilot authority.
