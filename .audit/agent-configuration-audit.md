# Agent configuration and Rat Stack maintenance audit

Inspected on 2026-11-04 at `630a89dd191e7711dadf893c10cc8c169407bc13`.

The requested outcome is a discoverable, maintained agent setup whose dependency and skill updates use Rat Stack evidence and expose reviewable diffs. This audit records the current wiring and the missing maintenance owner. It does not change running agents or update policy.

## Cleanup applied after the audit

The operator subsequently requested fixes. The local patch adds `/worktrees/` to `.gitignore`, removes the three lock entries for already deleted skills, corrects the obsolete publisher-suspension wording, and explicitly records manual maintenance for unlocked `editorial` and `motion`. Existing unrelated README and worker prompt edits remain intact.

The duplicate `anti-slop-effect` registration reproduced with `bun run lint:root`. The same command succeeded when `worktrees/**` was excluded. A nested checkout at `worktrees/ps-hwae` contains its own plugin configuration. The Git ignore boundary fixes root lint and formatting without changing rules or touching that checkout. This applies the Fix Root Causes principle at directory traversal rather than renaming the plugin or suppressing diagnostics.

A read-only live skill-candidate listing found no candidates for `apple-design` or `nestjs-best-practices`. The `review-animations` candidate `ps-f9k` was already closed and retired by the operator. No candidate records or retained artifacts were changed. A direct lock comparison proved that only the three removed entries changed and all 25 retained entries have installed skills.

`TURBO_SCM_BASE=HEAD TURBO_SCM_HEAD=HEAD bun run verify` passed after the fix with 14 successful tasks and 4 cache hits. Root lint and root formatting also passed individually. No new test was added for this configuration-only fix; the actual nested checkout supplied the reproducer. The historical failure below is resolved. Rat Stack refresh automation remains a separate, unimplemented maintenance feature.

## Configuration ownership

| Concern | Owner | Boundary |
| --- | --- | --- |
| Repository agent instructions | `AGENTS.md`, `apps/web/AGENTS.md` | Instructions require consultation; checks cannot prove an agent read guidance. |
| Repository skills | `.agents/skills/`, `skills-lock.json`, `gascity/skill-updates/` | Automatic publication changes one tracked skill and its lock entry. Global skills and plugin caches are excluded. |
| Gas City roles and scheduling | `/Users/benjaminschachter/personal-site-city/city.toml`, repository `gascity/` packs | Configuration spans repositories. Inspect effective configuration before claiming deployed behavior. |
| Codex integrations | `.codex/config.toml`, `.codex/hooks.json`, external/global configuration | Project MCP config contains Motion settings. Rat Stack MCP is available in this session. File presence alone does not prove hook execution. |
| Library source pins | `scripts/agent-sources.json` | Effect, XState and Gas City are registered. Rat Stack is absent. |
| Historical Rat Stack evidence | `agent-patterns/ratstack-inventory.json`, `scripts/ratstack-adoption.mjs` | 251 records pinned to the `benschac/meeeeed` archive, not a moving checkout of `joelhooks/rat-stack`. |
| Pattern retrieval | `scripts/agent-patterns.mjs` | `patterns consult` joins local decisions with inventory search results. |

## Findings

1. Rat Stack retrieval works. `patterns consult` imports `searchInventory` and returns source records alongside local decisions. All 251 records passed a real source audit against the clean sibling `meeeeed` checkout at `20afc6d3ea8980d133f3b3014d018ba1e37b58a0`. This establishes archive integrity, not freshness against today's Rat Stack.
2. Ongoing refresh has no explicit owner in the inspected update packs. `ratstack-adoption.mjs` supports check, search, audit, index, show and read. Indexing refuses a changed revision or changed existing bytes. It cannot produce an upstream revision update by itself. `scripts/agent-sources.json` does not register Rat Stack for its separate update discovery.
3. Neither normal update lane can safely absorb inventory changes. `scripts/skill-update.mjs` rejects paths outside one skill and `skills-lock.json`. Dependency discovery covers direct npm dependencies and holds source-pinned packages for review. `gascity/dependency-updates/SUPERVISION.md` supplies a separate reviewed remediation route for source pins and catalog evidence, but no scheduled Rat Stack refresh.
4. Passing verification does not establish use or freshness. Normal `patterns:check` validates metadata and local destinations. Full source-byte auditing is a separate command. No checked receipt in the inspected inventory code proves which source an implementation agent read or which decision it changed.
5. Stack CI exists, but is not a diff viewer. `scripts/stack-ci.mjs` skips a lower same-repository PR when an open child targets its branch. The top PR runs verification. This inspection started on `main`; `main...HEAD` is empty and local `origin/main` equals HEAD. No remote PR inventory or fresh remote fetch was performed, so this does not establish whether remote stacks exist.
6. Published skill updates do not update this checkout or an already-running agent's loaded instructions. The skill scanner explicitly records local divergence without overwriting it. Global/plugin skills and Gas City-managed symlinks have separate ownership.
7. Skill-pack import prose still refers to an existing dependency publisher suspension. Current supervision documents restored compatible-update authorization. Treat the import sentence as a stale historical assumption, while preserving actual per-candidate holds. The README already has unrelated edits, so this audit leaves it untouched.

## Proposed maintenance work

Give source maintenance its own scoped owner rather than weakening either update lane. Keep the historical archive and current Rat Stack upstream identities distinct. A refresh candidate should record old and proposed revisions, added/changed/removed source paths, affected local owners, and disposition decisions. Produce both the source diff and the proposed local adoption diff before changing pins.

Dependency and skill scope changes should hand affected guidance to that owner. Record the consulted source, the changed implementation decision or explicit non-applicability, and its validation evidence with the update. Existing hashes and successful structure checks are not substitutes for those receipts.

Acceptance requires a synthetic upstream edit to produce a visible drift report, preserve the current pin until review, identify impacted local guidance, and reject adoption with missing review evidence. Existing update scope guards must continue rejecting unrelated inventory edits.

## Cruft audit

The operator clarified that the request includes cruft, not an Audit IO or Craft integration.

| Finding | Evidence | Disposition |
| --- | --- | --- |
| Three stale skill lock entries | `skills-lock.json` retains `apple-design`, `nestjs-best-practices`, and `review-animations`. Their local directories were deleted by `8ad192f`, which did not change the lock. | Confirmed metadata leftovers. Recommend removing those lock entries in a scoped reconciliation after checking existing candidate bindings. Do not reinstall deleted skills. |
| Stale publisher-suspension prose | `gascity/skill-updates/README.md` import instructions assume a blanket suspension that `gascity/dependency-updates/SUPERVISION.md` supersedes. | Confirmed stale instruction. Recommend referring to current authorization and candidate-specific holds. Preserve concurrent README edits. |
| Similar hooks in two ignored files | `.codex/hooks.json` and `.gc/settings.json` both declare lifecycle hooks but differ in explicit city selection, executable selection, and output format. | Not proven redundant. The verified Gas City source has a Claude settings owner in `internal/config/launch_command.go` and separate Codex staging tests. Establish actual consumers before removing either file. |
| Two tracked skills without lock entries | `editorial` and `motion` exist among 27 tracked skill directories, but are absent from the 28-entry lock. | Ownership gap, not established cruft. The scanner explicitly excludes missing lock entries from automatic installation. Record whether these are manually maintained before adding update ownership. |
| Generated skill links | Gas City ownership metadata names eight managed links. Inspection found no broken links in `.agents/skills`. | Retain generated configuration. Its external cache targets are intentional ownership, not dead directories. |
| Historical Rat Stack records and audit artifacts | Inventory dispositions explicitly distinguish adopted, reference, and excluded material. Existing audit files preserve blocked-work evidence. | Age or reference-only status alone does not justify removal. No unused-tooling conclusion is established by this focused pass. |

This pass changed only this audit report. It did not remove configuration, modify the skill lock, or alter existing update candidates. The cleanup order is stale prose and lock reconciliation first, then consumer tracing for hook configuration. Runtime cleanup needs evidence that the relevant provider no longer reads the candidate file.

The skill inventory comparison used `git ls-files .agents/skills`, existing `SKILL.md` paths, lock keys, and symlink resolution. `bun run sources:check` passed for all three registered mirrors before using Gas City source to distinguish provider ownership. These checks do not prove live hook execution.

The verification rerun after this cruft addendum failed in `lint:root` with `Plugin name 'anti-slop-effect' is already registered`. Seven tasks succeeded from cache. This supersedes the earlier passing aggregate result for the current checkout. The cause was not diagnosed in this configuration audit. Formatting and `git diff --check` passed. Concurrent untracked `worktrees/` appeared during this pass, but a causal connection to the lint failure has not been established.

## Validation and evidence

- `bun run patterns:check` passed for 28 patterns and 251 inventory records.
- `bun run ratstack:adoption audit /Users/benjaminschachter/meeeeed` passed for all 251 source files.
- `node --test scripts/ratstack-adoption.test.mjs scripts/stack-ci.test.mjs` passed all 15 tests.
- `git diff --check` passed before audit artifacts were added.
- `TURBO_SCM_BASE=HEAD TURBO_SCM_HEAD=HEAD bun run verify` passed with 9 successful tasks, including 7 cache hits. Both audit files were formatted. The final `git diff --check` passed.
- `patterns consult "pinned sources"` and `patterns show behavioral-verification` informed this audit. Existing tests were reused because metadata validity is a different claim from source freshness or agent behavior.
- The pinned source `.brain/resources/lore/pinned-sources-can-report-drift.svx` and [current Rat Stack guidance](https://ratstack.sh/lore/pinned-sources-can-report-drift) support keeping drift diagnostics separate from immutable evidence. This changed the recommendation from blindly reindexing to reviewing a separate source diff.

## Scope interpretation

The request's "guest config" is provisionally interpreted as Gas City configuration. The operator clarified the remaining wording as auditing the setup and including cruft. `.audit/` holds the local report.
