# Scoped registry planning

Produce a proposed JSON registry for the coordinator. Read `AGENTS.md`, the autonomous development plan, task registry, progress report, prepared handoffs and the exact upstream contract revisions first. Beads owns live status, claims, attempts and evidence. This prompt does not authorize import, dispatch, scheduling or acceptance.

The coordinator is the sole canonical importer. Preserve `orchestrator-B1` → `psbp-ix9`, `orchestrator-B1a` → `psbp-yvt`, and `orchestrator-B1b` → `psbp-ix9.1`. Preserve the existing closed receipts, publication metadata and B1a published commit `8c5d2681d5aeb2432f97020baa9b59bb8d2bd14f`. Missing bootstrap records must be restored and independently checked before import. Never reconstruct their completed state from this prompt. A1 backend health, A2 launch evidence and A3 recovery/budget enforcement are distinct qualifications; the progress report does not establish all three are complete.

## Registry contract

Return `{ "tasks": [...] }`. Every task must supply these fields; use empty arrays only when the corresponding concern does not apply:

| Field | Required value |
| --- | --- |
| `id`, `title` | Stable task ID and concrete outcome; external ref is exactly `orchestrator-<id>` |
| `specificationRevision` | Full 40-character lowercase Git commit binding the approved specification |
| `ownedPaths` | Nonempty, explicit repository-relative paths reserved by the coordinator; no absolute paths, traversal or `.git` access |
| `acceptance` | Nonempty observable predicates and required evidence; a worker statement is insufficient |
| `checks` | Nonempty arrays of exact command arguments; these document checks and never execute through the importer |
| `inputRevisions` | `{id, revision}` entries binding each hard prerequisite and approved contract to its full contract/specification commit; completion receipts are separate runtime evidence |
| `hardPrerequisites` | Task IDs requiring completed artifacts before dispatch |
| `contractApprovals` | `{id, revision}` entries for approved interfaces/decisions, also present identically in `inputRevisions`; these are not completion edges |
| `gitParents` | Actual approved commit SHAs whose code is consumed; scheduling alone creates no Git parent |
| `reservations` | Coordinator resource names covering worktree, shared files, ports and caches; conflicts are not completion edges |
| `parent` | Optional grouping task ID, represented only by `parent-child` |
| `budget` | `{attempts, taskMs, checkMs}`; at most 3 lifetime attempts, 1800000ms task duration and 600000ms per check, with check duration no larger than task duration |
| `model` | `{id, effort}` from the approved plan; supported IDs are `gpt-6-luna`, `gpt-6.1-sol`, `gpt-6-astra`, efforts `medium` or `high`; coordinator must verify installed support |

Budgets are declared ceilings, not enforcement. Preserve remaining attempts and the original absolute deadline through restart and model changes. Do not invent input revisions, broaden ownership, approve contracts or add dependencies to make the schema pass. Return the precise missing coordinator input when a complete contract cannot be produced.

## Independent graph requirements

The coordinator supplies a separately reviewed `{taskIds, edges}` object to `validateRegistry`, `planImport` and `importRegistry`; never derive that expected graph from the candidate being checked. The full seed contains P0, A1–A3, B1, B1a, B1b, B2–B3, C1–C3, D1–D3 and E1–E3. Use the current versioned specification to confirm this baseline:

| Task | Hard prerequisites     |
| ---- | ---------------------- |
| P0   | None                   |
| A1   | P0                     |
| A2   | A1                     |
| A3   | A2, B2                 |
| B1   | P0                     |
| B1a  | P0                     |
| B1b  | B1a                    |
| B2   | B1                     |
| B3   | B2                     |
| C1   | P0                     |
| C2   | C1, B2, A2             |
| C3   | C2, A1                 |
| D1   | A1                     |
| D2   | D1, A2                 |
| D3   | D2                     |
| E1   | A1, B1                 |
| E2   | P0, A2                 |
| E3   | A3, B3, C3, D3, E1, E2 |

Each row becomes `{from: task, to: prerequisite, type: "blocks"}`. Add exactly two grouping edges, B1a → B1 and B1b → B1, with `type: "parent-child"`. Never add B1 as a blocking prerequisite of its own leaves. Contract P0 approvals, the E3 pilot behavior decision, ancestry, integration order and reservations remain separate fields. D2 must bind approved contracts as explicit revision-bound artifacts before live dispatch; native `ready` alone cannot establish contract approval or resource availability. Joins must name explicit leaves. A parent grouping does not establish child completion.

## Import API and qualification

`scripts/orchestrator-import.mjs` exports:

- `validateRegistry(registry, trustedRequirements)` → decoded tasks and exact validated edges; rejects unknown fields, omitted/extra tasks or edges, unknown targets, duplicate identities, cycles and invalid paths/budgets.
- `planImport(registry, records, trustedRequirements, adoptions?)` → create/adopt/keep actions, with no I/O. An existing contract is immutable: a differing contract requires coordinator revision handling rather than an overwrite. Legacy adoption requires `{ "orchestrator-ID": {id: nativeId, revision: currentNativeRevision} }` from a reviewed `show` result. Zero matches permits creation; multiple matches fail. The three reserved B1 identities must already exist.
- `createNativeStore({city, signal?, timeout?})` → the coordinator's explicit `gc --city CITY bd` adapter. `{directory, signal?, timeout?}` instead selects `bd -C DIR` for a disposable qualification store. Exactly one target is required. Commands use argument arrays, bounded output and timeout, propagate failure/cancellation, and never retry writes automatically.
- `importRegistry(registry, store, trustedRequirements, adoptions?)` → Promise of `{ids, actions, edges}`. Preflight completes before writes; all task IDs resolve before edge wiring. Metadata adoption writes only `orchestrator.contract`; status, claims, attempts, notes and prior evidence remain native-owned. Unknown existing dependencies fail; missing expected edges are added and the entire final set and native cycles are checked. Adding a prerequisite that invalidates closed work fails. Partial imports retain stable refs for reconciliation on replay.

Native commands used by the adapter:

```sh
gc --city CITY bd list --all --limit 0 --max-rows 2 --external-ref orchestrator-ID --json
gc --city CITY bd show NATIVE_ID --json
gc --city CITY bd create --title TITLE --description CONTRACT_JSON --external-ref orchestrator-ID --metadata CONTRACT_METADATA_JSON --json
gc --city CITY bd update NATIVE_ID --metadata CONTRACT_METADATA_JSON --json
gc --city CITY bd dep list NATIVE_ID --json
gc --city CITY bd dep add DEPENDENT PREREQUISITE --type blocks --json
gc --city CITY bd dep cycles --json
```

`CONTRACT_METADATA_JSON` is `{"orchestrator.contract": <contract object>}`. Use `--metadata` for this object; `--set-metadata` stores a string. Adoption never submits the original evidence keys back to an upsert. The importer assumes one coordinator, with contract/external-ref/edge changes quiescent during import; query-before-create is not atomic uniqueness and revision-bound adoption is a preflight check, not native compare-and-set. It does not claim concurrent importer safety or transactional rollback. If native execution times out after a write, re-query by external ref and reconcile; do not blindly create again.

Run focused pure tests with `node --test scripts/orchestrator-import.test.mjs`. The opt-in native qualification is `ORCHESTRATOR_NATIVE_QUALIFY=1 ORCHESTRATOR_NATIVE_SNAPSHOT=/absolute/path/to/reconciled-records.json node --test scripts/orchestrator-import.test.mjs`; it requires installed Beads 1.3.2, disposable embedded Dolt support and the coordinator's `.tools/gascity-bootstrap/reconciled-records.json`. It restores only B1/B1a/B1b into a temporary store, imports twice, and checks identical IDs/counts and preserved closed evidence. It never uses the canonical city. Missing prerequisites are qualification gaps, not a passed test. Normal tooling tests skip this machine-specific probe.

No scheduler, worker formula, D2 dispatch, canonical import, task closure or runtime qualification is supplied by D1's adapter. The coordinator reviews the complete contract JSON, current bootstrap evidence, graph requirements and importer patch before running the canonical import. Coordinator gates and independent review remain required.
