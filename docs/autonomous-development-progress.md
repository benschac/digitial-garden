# Gas City bootstrap evidence

## Native registry continuation

The 2026-11-01 continuation moved the complete plan into canonical `.tools/gascity-beads-pilot`, using Beads-managed proxied Dolt. Specification commits `e0dda12` and `89678b2` record native execution ownership and the approved blog filter. Native registry review `psbp-8zk` checked all 18 contracts and 31 edges against the specification and approved the corrected seed with explicit runtime caveats. Canonical P0 `psbp-f71` records the continuation authority; A1 `psbp-0z7` accepts only the demonstrated managed-proxy backend and same-mode backup/restore. A2 and A3 remain incomplete.

D1 `psbp-28r` is accepted and locally integrated as `b4d9e96081c86140168e734b6660f35779842e4f`, resulting tree `402518fb8ab99d753df48529deda27b31e3cdc66`, from expected main base `89678b25020ae83a18b989861430c172260ca497`. Original candidate `6c3272e` preserves worker attribution. Native independent review `psbp-hpq` found and then verified the correction for nested, case-insensitive `.git` ownership components. The resulting tree passed all 10 affected repository tasks in an isolated integration worktree before main fast-forwarded. No dependency or build configuration changed.

Canonical import resolved 18 IDs before wiring 29 blocking and two grouping edges. The second import returned only `keep` actions with structurally identical ID mappings. Existing statuses, claims, notes, descriptions, start/close fields, external references and every metadata key were preserved, including closed B1 evidence and active lifetime budgets. The coordinator's initial JSON-string comparison differed only in object-key insertion order; structural comparison passed without a third import. Evidence is under `.tools/gascity-bootstrap/canonical-{before-import,first-import,second-import,after-import,import-qualification}.json`. Native backup sync passed after import. This is local durable state, not off-machine recovery.

Gas City now carries coding and review work in the canonical graph. Native readiness is not integration authorization: the coordinator still resolves actual consumed commits, reservations, trusted policy and acceptance evidence before dispatch or integration. D1 supplies no scheduler, concurrent-import uniqueness or runtime deadline enforcement. Its native transport was exercised against the actual canonical proxy, in addition to the earlier disposable embedded-store qualification. Source decisions and exact checks are retained in the native implementation/review records; Effect remains 4.0.5 and Execa 10.2.1.

At D1 acceptance, B2 and C1 remained unaccepted. Review caught successful-check process leakage, unreachable-result transport and dependency-scope contamination in B2; the next patch fixed those, but native security review then demonstrated workspace executable contamination through `.bin`. C1 required producer-schema alignment and scalar-test classification corrections. Those findings remain attached to their original tasks and budgets. Suspension did not freeze one nudged worker; explicit session closure established later review freezes. No automatic integration or complete unattended recovery is claimed. Unrelated README edits and generated `.codex/hooks.json` were preserved.

## Original bootstrap

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

## B1b continuation on main

The coordinator reconciled the clean primary checkout at `8c5d2681d5aeb2432f97020baa9b59bb8d2bd14f`, the existing pilot/integration histories and canonical Beads records before dispatch. B1a remains closed; B1 `psbp-ix9` remains open pending B1b `psbp-ix9.1`. Historical worktrees and qualification artifacts were preserved.

The user explicitly superseded worktree isolation for this continuation and directed execution on `main`. Gas City session `psbp-wisp-ht1bj` uses that checkout with `gpt-6.1-sol` and `high` effort. The initial isolated session was closed before claiming or editing; it did not consume another implementation attempt. One coding worker owns only the evidence module and tests; coordinator owns documentation, shared configuration, review and commits. No publication or deployment is authorized by this continuation.

C1 preparation used Astra/high; D1–D2 preparation used Sol/medium. Both were read-only and did not mutate the live queue or permissions. Their concrete implementation contracts and unresolved boundaries are preserved in [the preparation handoffs](autonomous-development-handoffs.md). They do not establish implementation acceptance for C1, D1 or D2. The current B1b contract is persisted in Beads and `.tools/gascity-bootstrap/B1b-contract.txt`; legacy P0 smoke evidence is preserved.

B1b extends `validateEvidence` with required expected attempt identity; exact toolchain `{node,bun,platform,arch}`; ordered named checks with exact argv and log-artifact IDs; and ordered artifacts with unique IDs, paths and SHA-256 digests. Both inputs must be internally consistent. Required nested containers retain the own-data snapshot boundary, rejecting inherited/accessor/proxy/sparse entries without executing input behavior. Empty arguments remain valid; the executable must be nonblank. No command execution, artifact reads, authentication or integration authority is added. B2 owns those trust-producing operations.

Source decision: Effect remains pinned to 4.0.5 at mirror commit `7f524e25cfb49a71ac39b0f44278d08d40dda5de`. Implementation and reviewer read the installed instructions, matching schema-basics example and `packages/effect/SCHEMA.md`, plus `Schema.ts` (`Struct`, `TupleWithRest`, `NonEmptyArray`, string checks and `decodeUnknownResult`), parser/AST property access and matching schema/Predicate tests. Tuple/rest validation supports exact string argv; synchronous decoding reports schema mismatches while defects can throw. Direct property reads and inherited-field acceptance justify retaining descriptor snapshots before decoding. Source search found no public snapshot equivalent. No runtime/resource owner or dependency was added. Rat-stack routing and relevant lore remained unavailable; installed sources governed the adaptation.

B1b was accepted after one implementation attempt and committed locally on `main` as `2abe16e` (`feat: bind complete orchestration receipt metadata`). Independent Sol/high review found no actionable issues on frozen patch SHA-256 `c0b038427575c124d11b699b48dbc9416317a877a53f18824380ea0922edc6c7`; additional reviewer probes confirmed ignored extra getters and literal argument/path bytes. Coordinator checks passed: 20 focused tests, 26 pattern/source references, whitespace checks and affected `verify` (4/4 tasks). The first repository run hit sandbox `EPERM` on a local test socket; the scoped rerun passed. No build or dependency configuration changed, so no new production-build claim is made. Gas City worker template and session are suspended after handoff. This is coordinator-reviewed local acceptance, not qualification of automatic integration. B2 is the next evidence-stack task; C1 and D1–D2 remain preparation handoffs.

## Canonical continuation reconciliation

On the continuation after E1, the primary `main` tip was `d49af324f3dfd38402fc665c40b3402cfd04e2d6`. Canonical convoy `psbp-ftb` retains the pilot registry. Native records and Git ancestry confirm B1 at `2abe16e`, D1 at `b4d9e96`, and E1 at `d49af32` are accepted and integrated. Earlier sections describe historical checkpoints rather than the current queue. No registry import or store initialization was repeated.

B2 `psbp-t38` and C1 `psbp-9s2` remain blocked with `pilot.phase=deadline_exhausted`, respectively at attempts 3/3 and 2/3. Their original deadline remains `2026-11-01T23:59:12.682693Z`. Both isolated indexes match their frozen v3 patches exactly: B2 SHA-256 `486fb74e886d9d35c2df91f704d4fc346edfc2f4f0b89e5b46a14d1dfa811d6f`; C1 `1bb367b9f915231865f366f6c41f5f7008584c5f05b29626c7397af9232164e5`. Decision `psbp-1dx` remains pending. No review window, implementation retry, acceptance, or budget reset was inferred from the continuation.

A2 `psbp-bh7` was dependency-ready: A1 `psbp-0z7` and P0 were closed; A2 was unclaimed with no canonical attempt/deadline metadata. Historical smoke and fresh-session recovery artifacts remain preserved and do not establish current permission or cancellation qualification. The coordinator reserved `automation/a2` in `.tools/gascity-worktrees/a2` at the primary tip and dispatched the existing task through native Gas City using `gpt-6.1-sol` at high effort. Its first canonical attempt and absolute deadline are recorded on the bead and in `.tools/gascity-bootstrap/a2-dispatch-metadata.json`; live state remains in Beads. No other pilot implementation lane was resumed.

The A2 worker explicitly claimed through `gc hook --claim`, after a scoped cache-lock escalation; native reads need access to Gas City's existing global pack cache lock. Session `psbp-wisp-vo0e5` was replaced by `psbp-wisp-9kmx4` before the observed claim, retaining the same task attempt and deadline. Native `session peek` confirmed the worker's live terminal. `session logs` exposed an apparent approval-review transcript correlation mismatch, so transcript output alone is insufficient evidence for worker behavior. Permission denial, cancellation, independent review, and delivery gates remain necessary before A2 acceptance. This is coordinator-supervised qualification, not automatic recovery or lifetime-budget enforcement.

The primary README edit and `.codex/hooks.json`, historical worktrees, preserved patches, and canonical store were retained. Reconciliation and the bounded worker contract are in `.tools/gascity-bootstrap/a2-reconciliation.json` and `a2-contract.txt`. Rat-stack vision and agent rules were readable; its procedure routing page remained unavailable. No new library, scheduler, permission profile, publication, or deployment was introduced.

A2's new scratch probe failed with OS `EPERM` and left no marker. The running provider's recorded writable roots excluded the authoritative checkout and shared Git directory; this is configuration evidence alongside the scratch denial, not an attempted write to either protected location. The worker produced only its two owned TOML/JSON files and local evidence logs. The coordinator independently parsed both files and verified all artifact hashes listed at that checkpoint.

For supervised cancellation, the worker launched a single 120-second foreground heartbeat probe, PID `62607`, under session `psbp-wisp-9kmx4`. The coordinator captured the live process and heartbeat, suspended template `a2`, and explicitly closed that session. The process was absent afterward before its natural completion time; the heartbeat stabilized at 59 lines and the completion marker remained absent. Both owned output hashes stayed unchanged. Evidence is in `.tools/gascity-bootstrap/a2-cancellation-before.json`, `a2-cancellation-after.json`, and `a2-freeze.json`, with the probe artifacts under the A2 worktree's `.tools/a2/attempt-1/`. This establishes the observed supervised stop, not recovery, retry exhaustion, or a lifetime watchdog.

The frozen candidate remains unaccepted and uncommitted. Its observation report explicitly leaves remote-push prevention unproven, and native claim required a scoped cache-lock approval. Independent native observation review `psbp-8uq` was dispatched as Sol/high after the worker stopped, without resuming other pilot lanes. This bounded evidence review does not substitute for the three-role review required to accept a sensitive implementation. No A2 hard dependent was released.

Independent review `psbp-8uq` corroborated both frozen output hashes, all 24 artifact hashes, the scratch denial, and the bounded foreground-process cancellation. It found one expected live-input delta: the coordinator's stop added `suspended = true` to the native A2 agent settings. Removing that line reproduces the frozen settings exactly; the original input manifest remains historical and must not be described as unchanged after suspension. The worker's cancellation-pending JSON likewise remains a prelaunch snapshot, complemented by the coordinator's later evidence rather than rewritten.

A2 remains blocked as `qualification_incomplete`, with the original attempt and deadline retained. Remote-publication enforcement and an independent controller startup audit remain gaps; scoped claim approval does not establish unattended claim. Both the coding and observation-review templates are suspended and their exact sessions closed. Review evidence is preserved in `.tools/gascity-bootstrap/a2-observation-review.json`. No new permission policy or adapter was adopted, no sensitive implementation was accepted, and A2 hard dependents remain gated. A subsequent continuation must reconcile the existing deadline before dispatching more work.

During reconciliation, unrelated README work landed concurrently as `6f611f4`. Its bytes and the primary `.codex/hooks.json` still matched the initial preservation hashes; the coordinator did not include that work in the pilot change. The final affected repository gate passed (2/2 tasks), and the existing native local backup synced. No production build or off-machine recovery claim is made for this observation-only delivery.
