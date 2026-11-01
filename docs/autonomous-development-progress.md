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

At the time of the initial bootstrap, the running city used the file provider. `gc bd` refused that backend. Embedded Beads backup success does not qualify Gas City's server integration or concurrent writers. Existing city state was not migrated. A1, A2, and A3 remain incomplete under the execution plan.

## Bootstrap durable state

- The existing mayor remains running and was not restarted.
- `pilot-worker` and `pilot-recovery` templates are suspended. The recovery session was explicitly suspended after completion.
- Native work beads `gc-64` and `gc-101` retain `pilot.result` metadata written through exact-store compare-and-set. They are not marked integrated or complete.
- `.tools/gascity-bootstrap/P0.json` records the base, worktree, one-worker limit, and local-only authority.
- `.tools/gascity-bootstrap/A1.json` records the embedded store qualification and its limits.
- `.tools/gascity-bootstrap/A2-status.json` records the failed recovery outcome.
- `.tools/gascity-bootstrap/A2-receipt-after-failed-resume.bin` preserves the malformed artifact.
- `.tools/gascity-bootstrap/A2-recovery.json` records independently checked fresh-session output.

These ignored files persist locally across agent restarts, but are not an off-machine backup. The versioned report preserves conclusions if the local experiment directories are unavailable. At this bootstrap checkpoint, canonical-store qualification remained pending; see the later live-store results below.

## Remaining bootstrap qualification

1. Re-read the execution plan and inspect current city state before resuming either pilot template. Keep the failed evidence intact.
2. Qualify the supported Gas City Beads provider in a separate city or disposable backend. Resolve standalone Dolt compatibility before changing the existing store.
3. Inspect the installed managed Codex hook lifecycle and its matching source. Upgrade only the relevant managed hook through a targeted native operation if the evidence requires it.
4. Run a new bounded task with actual native claim, progress, and acknowledgement. Use unique attempt artifacts and trusted strict validation before accepting completion.
5. Test forced interruption during that task, then show preserved task identity and attempt budget through recovery. Test exhaustion separately from successful artifact production.
6. Enable two workers only after isolation, protocol completion, and bounded recovery pass. Keep local integration gated on stack B and C evidence.

No new user decision is needed for these already-authorized local qualification steps. Broader credentials, destructive migration, remote publication, and deployment remain outside the pilot authority.

## Live Beads qualification and unattended startup

On 2026-11-01 the coordinator initialized a separate native city, `personal-site-beads-pilot`, under `.tools/gascity-beads-pilot`, using `gc init --template minimal --default-provider codex --name personal-site-beads-pilot --beads-target local --beads-transport proxied --no-start`. This preserves the original city's independently changing configuration. The native bootstrap generated pinned `bd` and `core` pack imports at commit `2e643dc2eb5ff84d9853ecaa6961a87a8e4043ae`. The pilot has no always-on mayor.

Both cities now have healthy Beads-owned proxied Dolt stores. Native `doctor --check beads-store --check dolt-server --json` passed with live served endpoints and matching cursors. The original city's `/v0/city/personal-site/health` returned `status: ok`. These are CLI/API checks, not rendered dashboard verification. No manually configured second database endpoint is needed. The supervisor and Beads provider own endpoint discovery.

Task `psbp-yvt` (`orchestrator-B1`) was claimed through `gc hook --claim` by worker session `psbp-wisp-gpd`. The first implementation passed seven focused tests but failed three repository lint rules. The coordinator withheld acceptance. The task stayed open, and verification failures were persisted in Beads.

Codex's managed hook-trust dialog initially required manual intervention. The isolated pilot provider now adds `args_append = ["--disable", "hooks"]` and `accept_startup_dialogs = false`. It retains `--sandbox workspace-write --ask-for-approval on-request`; automatic startup-dialog acceptance would trust hooks and is intentionally disabled. Native configuration validation passed. This disables hook-based session correlation too, so it does not prove session-resume recovery.

After closing the idle first session, the coordinator resumed the worker template and re-slung the same task. Session `psbp-wisp-21r` launched with `codex --disable hooks --sandbox workspace-write --ask-for-approval on-request --model gpt-6.1-sol -c model_reasoning_effort=high` and claimed the existing task without a coordinator keystroke or submitted prompt. The task ID and its earlier evidence survived. This proves fresh unattended startup and durable re-claim, not automatic crash recovery or budget enforcement.

The user approved root tooling's use of the already pinned Effect 4.0.5 for schema decoding. Attempt 2 owns only the two evidence scripts; the coordinator owns the package and lockfile edits. The source mirror passed `sources:check` at `7f524e25cfb49a71ac39b0f44278d08d40dda5de`. Model and effort are persisted as task metadata. Attempt counting is coordinator-maintained in this qualification; native lifetime retry enforcement remains unqualified.

The isolated worktree is `.tools/gascity-worktrees/beads-worker`, branch `automation/beads-worker`. The integration target remains `automation/personal-site-pilot`. Neither remote publication nor deployment is enabled. Do not start a second writer in this worker worktree. Suspend the template when qualification ends; its current minimum capacity of one is a launch experiment, not a measured efficient idle policy.

## Evidence leaf and source decision

The first code leaf is B1a, task `psbp-yvt`, under parent B1 `psbp-ix9`. The parent remains open. B1b `psbp-ix9.1` depends on B1a and owns complete receipt metadata. This subdivision preserves the original contract rather than treating the smaller helper as a complete trusted verifier.

`scripts/orchestrator-evidence.mjs` uses Effect Schema 4.0.5 to decode task/candidate/base/verifier identities and a nonempty list of named successful checks. It requires a nonblank attempt identifier but does not yet compare it with an expected attempt. It does not authorize integration or establish that the named checks actually ran. The coordinator added the approved exact root development dependency; the web app's version did not change.

Source consulted: Effect mirror `7f524e25cfb49a71ac39b0f44278d08d40dda5de`, `ai-docs/src/01_effect/02_schema/10_schema-basics.ts`, `packages/effect/SCHEMA.md`, `Schema.ts` (`Struct`, `NonEmptyArray`, `Literal`, `decodeUnknownResult`, string checks), `SchemaAST.ts`, `SchemaIssue.ts`, `Predicate.ts`, and matching schema/Predicate tests. Schema mismatches produce synchronous Result failures; defects can throw. Struct reads properties and can accept inherited fields. The helper therefore snapshots required own data descriptors before decoding, rejects proxy containers, and does not inspect extra properties. This reflection boundary is separate from domain validation; no runtime, async adapter or new resource owner was introduced.

The independent Sol/high reviewer confirmed the exact patch and source behavior and found no actionable issues. All 10 focused tests passed, covering malformed and stale identities, failed checks, frozen/null-prototype data, inherited/accessor/proxy values, and hostile scalar fields. The explicit array guard duplicates Predicate.isObject's rejection; its regression test was not a failing-before reproduction.

Coordinator checks on the stable worker patch passed: affected `bun run verify` (15 tasks) and `bun run verify:full` (16 tasks including production build). The latter reused 15 cached successful tasks. No performance or billing improvement is claimed. Rat-stack vision and agent rules were readable through the coordinator's web tool; the routing/procedure and relevant lore pages were unavailable. Matching installed Effect sources governed the implementation.

## Local integration checkpoint

The independently reviewed B1a implementation was committed as `1589c62d27a2967d23dfa72bc50e6f3824a86bbb` (tree `c45528251b3ca8c93b4b7baf4ddd79e66966851d`) and fast-forwarded into the isolated `automation/personal-site-pilot` branch. This was coordinator-operated local integration, not a qualification of the future automatic integration engine. The primary checkout's unrelated edits and index were not included.

The worker template and session `psbp-wisp-21r` are suspended after handoff, preventing idle worker capacity from launching more model work. Resume only after reconciling the task and branch state. Cost remains unknown; elapsed command time and cached task counts are not billed-model measurements.

## Native backup and restore result

The live managed-proxy store's existing local backup destination is `.tools/gascity-beads-pilot/.dolt-backup/hq`. Native `gc bd backup sync` succeeded. A fresh embedded restore failed with `table has unknown fields: write commit result indeterminate`; the failed disposable repository is preserved at `.tools/gascity-native-restore`. Cross-mode restoration is not qualified.

Restoring into a separately initialized Beads-managed proxied server succeeded at `.tools/gascity-native-proxied-restore`. An early comparison observed a live claim-release status/revision change after the snapshot. After the leaf was closed and a new backup taken, all compared fields matched: ID, title, description, notes, status, external reference, metadata and revision. Evidence is in `.tools/gascity-bootstrap/A1-native-recovery.json` with the captured source and restored records. Use the same managed-proxy mode for this recovery procedure; do not infer embedded-engine compatibility from a successful backup. The live database was not overwritten.

B1a is now closed with its local integration commit and tree. Native close emitted a warn-only work-record requirement for `gc.work_outcome`; the coordinator recorded `shipped` for the locally integrated leaf and synced the backup again. This native warning is not an enforcement boundary. The future trusted verifier and integration authority must enforce acceptance independently. Local backup and restore are demonstrated; off-machine disaster recovery remains unconfigured.

## Native retry exhaustion without coding workers

A disposable v2 formula, `.tools/gascity-beads-pilot/formulas/qualify-check.toml`, uses `max_attempts = 3` and an operator-owned exec checker at `assets/checks/always-fail.sh`. The script emits a deterministic rejection and exits 1. `formula show` verified the compiled graph; `formula cook` created workflow `psbp-q10` with control `psbp-yzm`. The coordinator submitted ordinary no-op iterations directly through Beads. They remained unrouted and unassigned; coding workers stayed suspended. Only the native `gc convoy control --serve` dispatcher executed checks. This fixture required no coding-model calls, separate from the model-assisted source audit.

Iterations `psbp-l98`, `psbp-osd`, and `psbp-bmf` each produced an independently recorded check failure. After the first rejection, the coordinator closed only the dedicated native dispatcher session `psbp-wisp-8h50`. Its replacement `psbp-wisp-feg4` continued the same workflow and counter. The control and root then closed with `gc.outcome = fail`, `gc.failed_attempt = 3`, and exactly three failure entries in the attempt log. The recorded graph contains no fourth iteration. Assertions over these records passed; `.tools/gascity-bootstrap/A3-native-exhaustion.json` identifies the captured evidence.

This qualifies native counter exhaustion and dispatcher replacement between attempts, not coding-worker recovery, fresh contexts, abrupt termination during a check, checker-timeout cancellation, or a total wall-clock budget. Closing an ordinary iteration submits it for checking; it does not establish integration acceptance. The outer task must still wait for trusted verification and coordinator acceptance.

Source audit used Gas City v1.5.1's [formula contract](https://github.com/gastownhall/gascity/blob/v1.5.1/docs/reference/specs/formula-spec-v2.md), [control evaluation](https://github.com/gastownhall/gascity/blob/v1.5.1/internal/dispatch/control.go), and [checker execution](https://github.com/gastownhall/gascity/blob/v1.5.1/internal/dispatch/ralph.go). Native check timeouts are per invocation; `max_session_age` is per session. Neither supplies a thirty-minute absolute task deadline across replacement sessions. The v2 `ralph` path treats non-pass check results as continued attempts, unlike the older check path's separate infrastructure-retry normalization. Exit-75 behavior was source-reviewed but not exercised by this fixture. Do not enable unattended production task loops until deadline enforcement, trusted completion, and error classification are explicitly qualified.
