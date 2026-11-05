# Maintain project skills through checked updates

This pack maintains only existing tracked `.agents/skills/<name>/` directories and their existing `skills-lock.json` entries in `benschac/digitial-garden`. Global skills and plugin caches are outside its scope. The registered checkout stays untouched. A published commit updates repository history. It does not synchronize an existing checkout or prove deployment acceptance.

The tracked `editorial` and `motion` skills have no lock entries and remain manually maintained outside this pack. Adding either to automatic updates requires verified source provenance and a matching installed content hash. Missing lock entries are not installation requests.

The daily order runs at 09:00 America/New_York. One scanner inventories all tracked candidates against fresh remote main. Eight preparation slots work in isolated clones. Two independent reviewer slots examine immutable commits. One publisher lands one skill at a time above fresh main. Each commit changes one skill directory and only its existing lock entry. Source revisions are full Git object IDs and content hashes use the Skills CLI algorithm.

The order is enabled for this city. Before importing into another running city, add the disabled city override shown below. Do not run it manually as a preview. `gc order run` dispatches real work and can lead to commits and pushes.

## Import and activate

Keep the existing dependency pack under its [current operator authorization](../dependency-updates/SUPERVISION.md#current-operator-authorization). This pack does not lift any candidate-specific Node dependency commit or publication hold.

1. Run `gc lint gascity/skill-updates`, the focused `scripts/skill-update.test.mjs` checks, and the repository's affected `bun run verify`. Before importing, add this native city override.

```toml
[[orders.overrides]]
name = "skill-updates"
rig = "personal-site"
enabled = false
```

2. Add a sibling import under the existing personal-site rig in the city's city.toml. Use import alias `skills`, because step routes are `skills.scanner`, `skills.worker`, `skills.reviewer`, and `skills.publisher`.

```toml
[rigs.imports.skills]
source = "/Users/benjaminschachter/personal-site/gascity/skill-updates"
```

3. Inspect effective configuration and compiled graphs before enabling the order.

```sh
gc --city "$HOME/personal-site-city" config show
gc --city "$HOME/personal-site-city" --rig personal-site formula show scan-skills
gc --city "$HOME/personal-site-city" --rig personal-site formula show update-skills
gc --city "$HOME/personal-site-city" --rig personal-site formula show update-skill
gc --city "$HOME/personal-site-city" order show skill-updates --rig personal-site
```

4. After review, change that city override to the value below. Validate and run `gc reload --soft` so the existing Mayor is not restarted for this import. Gas City may catch up a missed cron slot immediately. Confirm order history and actual workflow/candidate evidence before claiming activation. Gas City filters orders disabled in their own files before applying city overrides, so keep the file enabled when using an override.

```toml
[[orders.overrides]]
name = "skill-updates"
rig = "personal-site"
enabled = true
```

```sh
gc --city "$HOME/personal-site-city" order history skill-updates --rig personal-site
gc --city "$HOME/personal-site-city" --rig personal-site bd list --all --limit 0 --label skill-update --json
```

The host must be awake with Gas City running and GitHub access available. The native check wrappers explicitly include this machine's trusted Bun and Node locations because check scripts receive a sanitized PATH and a city-owned HOME. Publication proof reads the expected public GitHub repository over HTTPS. Publisher pushes use its normal authenticated environment. A missing runtime or authentication failure remains a failure, never a successful check.

## Follow a candidate

The scanner creates persistent candidate beads keyed by skill name, source revision, and target content hash. It reuses existing held, failed, running or completed exact candidates. It admits at most one active candidate per name. Missing directories, mismatched local hashes, removed/renamed sources, unsupported source formats and uncertain behavior become holds. Existing local divergence is recorded separately from remote main. The scanner never restores customized or missing local skills.

Eligible candidates enter a recorded convoy in their rig store. The scanner creates it with the first existing eligible candidate, for example `gc --city "$GC_CITY" --rig personal-site convoy create "$BATCH_NAME" "$FIRST_CANDIDATE" --json`, records the returned ID immediately, and then adds the remaining candidates. Empty convoy creation selects the city store even with `--rig`, so it cannot be used for this rig batch. Recovery reuses a valid recorded convoy; a failed empty convoy retains its evidence and replacement linkage without recreating candidates. The scanner verifies that convoy and candidates share the rig store, then targets `update-skills` at that convoy. Its native exclusive, separate-context drain runs `update-skill` per member with a 100-member cap. Native reservations protect the source anchors. The item workflow resolves the original candidate from `gc.input_convoy_id` and synthetic convoy `gc.drain_member_id` metadata.

Preparation, review and publication each use a native exec check. Integration and its trusted qualification command remain inside the single claimed publication task. The trusted prepared and integrated wrappers run frozen installation and affected repository verification under the city verification lock. The publisher retains its claim through reconstruction, qualification and push, so another publisher task cannot invalidate its base during qualification. It still checks for external main races and rebuilds within a three-attempt budget. Successful qualification binds the exact commit and tree. A changed remote base requires a fresh qualified attempt. Their fail-closed scope prevents downstream work after failure. Each check has one semantic attempt. Gas City's separate infrastructure budget bounds genuinely unavailable infrastructure without treating it as a successful verdict. There is no detached watcher, custom retry daemon or `loop.until` label. After successful publication checking, an explicit acceptance step records landed evidence and closes the original source candidate. The controller then finalizes the workflow. Drain finalization alone does not close source members. Failed source beads stay open with evidence. An unchanged failed target is never requeued by the next daily scan.

Pooled sessions may lack sling-time artifact variables. Before prepare, review or publish iterations and the direct acceptance step, resolve the actual claimed step from claim JSON or `gc --city "$GC_CITY" hook current --id-only`, then read its live status, actual claimed assignee and `gc.root_bead_id`. After validating the IDs as safe path segments, derive `$GC_CITY/.gc/molecules/$ROOT/artifacts/$CLAIMED_STEP`. Existing nonempty `GC_BEAD_ID` and `GC_ARTIFACT_DIR` must match that claimed step and exact path; otherwise stop. Export the missing values for role commands and trusted manual checks, preserve unknown files and contradictory pointers, and stop on ownership loss. The controller independently derives this same iteration path for its checks; a trigger or logical control ID is not the claimed-step identity. A preflight-only stop can continue the same still-claimed step after validation, without reopening failed iterations or resetting check budgets.

Requests and receipts live under `$GC_CITY/.gc/skill-updates/<candidate>/`. Each iteration writes a `{candidate,stage}` pointer at `$GC_ARTIFACT_DIR/result.json`. The trusted `scripts/skill-update.mjs` checker resolves native identity independently and validates artifacts. Do not accept a freely supplied artifact path or a worker's passing prose as proof. Review evidence records security and compatibility judgments; those judgments are not a sandbox or a Git permission boundary. The verifier's implemented checks and test evidence define its enforcement, rather than this document alone.

Preparation uses the immutable `request.scanBase`, which must remain an ancestor of fetched main. The preparer records fresh main separately and checks that the selected skill bytes and complete lock entry still match the scanned baseline and request. Relevant drift remains a hold. An unrelated advance of main alone does not require changing the request or preparation base. The publisher owns reconstruction and requalification above then-current main.

Molecule artifact directories are temporary working storage. Gas City removes them when the workflow finalizes. Before closing a failed preparation step, copy its available failure report and logs into the candidate-owned `attempts/<workflow-root>/<claimed-step>/` archive without overwriting evidence or moving the canonical pointer. Record archive paths and hashes on the candidate. This preserves preparer-owned evidence; logs written later by native checks need their own durable retention owner.

One preparer creates one candidate commit. An independent reviewer binds approval to its exact commit/tree. The publisher reconstructs only that selected change above freshly fetched main and preserves already landed lock entries. It verifies the final tree, fetches again before a normal non-force push, and allows at most three landing attempts. Uncertain push outcomes require remote ancestry reconciliation before any retry. Candidate-owned artifacts survive failure and uncertainty; molecule storage has the shorter lifetime described above. Remediation needs a separately scoped owner and concrete resolved blocker; it is not an automatic retry.

## Gas City source audit

The design was checked against installed Gas City 1.5.1 and the project's matching source mirror at commit `4f698fe2a7eefae49e545c5e38189f1b63fb9b39`. `bun run patterns consult gascity` selected `gascity-source-lookup`. The source lookup changed the design from prompt-owned handoffs to native checked graph members and an exclusive drain.

Read the matching [orders tutorial](https://github.com/gastownhall/gascity/blob/v1.5.1/docs/tutorials/07-orders.md), [formula guide](https://github.com/gastownhall/gascity/blob/v1.5.1/docs/guides/understanding-formulas.md), [v2 specification](https://github.com/gastownhall/gascity/blob/v1.5.1/docs/reference/specs/formula-spec-v2.md), and [pack specification](https://github.com/gastownhall/gascity/blob/v1.5.1/docs/reference/specs/pack-spec.md). Owning implementation includes `internal/dispatch/ralph.go`, `internal/convergence/condition.go`, `internal/dispatch/drain.go`, and `cmd/gc/order_dispatch.go`. Relevant upstream tests include `ralph_check_infra_blind_test.go`, `drain_conditional_test.go`, `order_dispatch_graph_store_test.go`, `order_dispatch_gate_policy_test.go`, and `cmd_hook_claim_test.go`.

The pinned architecture orders document contains stale limitations about cron ranges, hot-added orders and tracked dispatch. The normative specification, current tutorial, implementation and tests take precedence. The v2 specification also states that `loop.until` has no runtime consumer. Native `check` supplies the bounded run/check behavior used here. Untargeted scheduled drains are invalid, so discovery dispatches a targeted convoy after inventory. Check and drain cannot occupy the same step, so checks belong to the item formula.

Pack lint and compiled previews prove configuration shape. They do not prove live dispatch, worker execution, remote publication or deployment. Inspect those outcomes separately.
