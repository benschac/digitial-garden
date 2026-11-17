# Engineering evidence and Gas City handoff rules

Status: Planning guidance. Implementation source lookup and independent review are still required against the actual patch.

## Authority and historical material

The owning repository has no top-level `.brain` directory. It indexes inherited brain material in [ratstack-inventory.json](../../../agent-patterns/ratstack-inventory.json).

[The adoption record](../../../agent-patterns/ratstack-adoption.md) pins that archive to `benschac/meeeeed@20afc6d3ea8980d133f3b3014d018ba1e37b58a0`. Dispositions distinguish adopted, reference, and excluded records. Historical examples and review policies do not prove that a runtime subsystem exists.

Current owning code, repository instructions, [engineering policies](../../../agent-patterns/engineering-policies.md), and [the catalog](../../../agent-patterns/catalog.json) govern local adaptations. The [standard-library directory](../../standard-libraries.md) identifies existing implementation owners.

Current [Rat Stack vision](https://ratstack.sh/VISION.md) and [agent rules](https://ratstack.sh/AGENTS.md) provide upstream context. Their package manager, framework, infrastructure, and dependency pins are not instructions to migrate this app.

## Source lookup required for every implementation and review

Follow the repository's [source lookup workflow](../../../agent-patterns/README.md):

1. Run `bun run patterns consult <concern>` and read the matching local entries with `bun run patterns show <id>`.
2. Follow a matching archive record to its pinned source before using it. A search hit alone is insufficient.
3. Check the consuming manifest, lockfile, installed package, and source mirror identity. Resolve mismatches before adopting API examples.
4. Read the installed Effect `AGENTS.md` and linked examples. Inspect the relevant public exports, implementation, and upstream tests for the installed version.
5. Reuse a suitable local owner. Otherwise explain the gap and introduce only the feature-owned adaptation needed.
6. Report the source identity, behavior established, decision made, application check, and unresolved limitations.

Source verification is required again during review. Reviewers independently check the claimed behavior against the stable patch.

The repository uses Effect v4, but the exact installed version still governs API choices. A remembered v3 recipe or a newer online example is not sufficient evidence.

## How the patterns change this feature

| Concern | Local pattern IDs | Concrete consequence |
| --- | --- | --- |
| Inputs and persisted records | `validated-input`, `schema-evolution` | Decode provider responses and local documents at their boundaries. Keep saved versions readable and report unsupported versions without overwriting them. |
| Durable runs | `durable-work-and-replay`, `retry-and-timeout-policy` | Persist stable inputs and accepted request identities. Unknown acceptance never becomes an automatic paid retry. A scope or in-memory cache does not provide restart recovery. |
| Submission identity | `submission-acceptance`, `transport-contracts` | Distinguish accepted, rejected, and uncertain submission. Cancellation of local observation does not cancel an accepted remote job. |
| Runtime ownership | `runtime-boundary`, `service-composition` | Execute Effect at the server or framework integration boundary. Declare runtime disposal. Reusable operations remain composable. |
| Resource cleanup | `resource-ownership`, `replaceable-resources` | Own preview resources, downloads, and temporary export files. Clean up on success, failure, interruption, and superseded work. |
| Browser behavior | `react-lifecycle` | React owns interaction and browser lifetimes. Reuse existing hooks for events, media queries, frames, and abortable work. Pure calculations need no Effect wrapper. |
| Domain boundaries | `domain-boundaries`, `adapters-cartridges` | Keep asset-generation contracts with the app feature. Provider specifics remain behind narrow adapters. Do not create a general provider framework. |
| Verification | `behavioral-verification` | Test externally observable failures and transitions. Prove actual persistence, not merely calls to a storage mock. Inspect rendering in a browser. |

The current lore pages [Run Effect at the integration boundary](https://ratstack.sh/lore/run-effect-at-the-boundary) and [Scopes release resources when work ends](https://ratstack.sh/lore/scopes-own-resources) support the runtime and resource decisions above. They do not replace version-matched library source.

## Existing code to inspect

These files provide examples. They are not an existing implementation of the proposed asset workflow.

| Owner | Useful evidence | Limit |
| --- | --- | --- |
| [Prompt attachment coordinator](../../../apps/web/src/components/ai-elements/prompt-input-attachments.ts) | Conversion failures, duplicate suppression, identity, and late completion checks. | Asset generation needs its own persisted run identity. |
| [Chat acceptance boundary](../../../apps/web/src/app/_components/agent-chat-submission.ts) | Accepted, cancelled, and unconfirmed outcomes. | Eve-specific behavior does not prove an image provider's guarantees. |
| [Sample database service](../../../apps/web/agent/lib/sample-db-service.ts) | Service composition, acquisition, and runtime lifecycle. | Its in-memory database is not durable project storage. |
| [Social preview lifecycle](../../../apps/web/scripts/social-preview-lifecycle.ts) | App-owned workflow, native adapters, failures, and cleanup. | Do not copy its entire execution stack for file export. |
| [Renderer lifecycle](../../../apps/web/src/app/experiments/wasm-canvas/renderer-lifecycle.ts) | Resource acquisition and release. | No GPU renderer is required for layered image preview. |
| [Wet ink resources](../../../apps/web/src/app/wet-ink-resources.ts) | Replacement, rollback, and cleanup after supersession. | Reuse the behavior where appropriate, not renderer-specific code. |
| [Typography metrics schema](../../../apps/web/src/app/typography-metrics-schema.ts) | Owning-domain Effect Schema. | Assets require their own validated shape. |
| [Abortable React effect](../../../packages/react-hooks/src/use-abortable-effect.ts) | Browser lifetime and cancellation. | Browser cancellation does not establish remote cancellation. |

Relevant archived lore includes `durable-work-needs-storage`, `replay-needs-stable-inputs`, `old-events-must-still-decode`, `retry-needs-idempotency`, `timeouts-bound-waiting`, `pure-cores-reduce-timelines`, and `schemas-define-the-boundary`. Resolve these through the pinned inventory rather than assuming a current archive path in this repository.

## Ownership for the revised graph

The [revised ticket graph](README.md#contracts-frozen-at-split-points) owns module boundaries and contracts. The [stack workflow](stack-workflow.md) owns branch bases and serialized metadata changes.

AW-01 owns projects, AW-02 references, AW-03 style revisions, AW-04 run submission, AW-05 recovery, AW-06 output selection, AW-07 style application, AW-08 approval, AW-09 layer generation, AW-10 presentation edits, AW-11 motion preview, and AW-12 export. AW-13 coordinates integration and independent review.

The coordinator assigns concrete files before dispatch. Each parallel group has separate responsibility modules and a single writer for shared contracts and page wiring.

An independent reviewer must not count another agent's source summary as its own verification. Missing source or provider evidence remains an explicit gap.

## Gas City evidence

[The city configuration](/Users/benjaminschachter/personal-site-city/city.toml) and [pack configuration](/Users/benjaminschachter/personal-site-city/pack.toml) establish the current rig and pinned role pack.

The installed sources establish the executing continuation:

- [Plan workflow](https://github.com/gastownhall/gascity-packs/blob/3b3b89f2011e06d84459aa7bea1552382f13930a/gascity/formulas/build-from-plan-base.formula.toml) defines plan and plan-review stages and inherits decomposition.
- [Decomposition instructions](https://github.com/gastownhall/gascity-packs/blob/3b3b89f2011e06d84459aa7bea1552382f13930a/gascity/assets/workflows/build-from-decompose-base/decompose.md) require traceable implementation work and a convoy.
- [Convoy workflow](https://github.com/gastownhall/gascity-packs/blob/3b3b89f2011e06d84459aa7bea1552382f13930a/gascity/formulas/build-from-convoy-base.formula.toml) starts the implementation drain.
- [Decomposition schema](https://github.com/gastownhall/gascity-packs/blob/3b3b89f2011e06d84459aa7bea1552382f13930a/gascity/schemas/build/decomposition.v1.yaml) requires live workflow and producer metadata, selected downstream formulas, implementation convoy, and work items.

Do not fabricate the required live metadata in these local drafts. A `draft` artifact status does not establish an execution hold.

## Matt skills mapping

The next main-flow step is ticket decomposition using the already written spec. The existing Gas City orchestrator owns eventual execution.

The Matt tracker configuration is now installed in `docs/agents/`. It uses Gas City Beads, native dependency links, and no readiness label during preparation.

The [to-tickets skill](/Users/benjaminschachter/.codex/plugins/cache/mattpocock/mattpocock-skills/1.3.2/skills/engineering/to-tickets/SKILL.md) requires approval of the proposed breakdown before publication. The [setup skill](/Users/benjaminschachter/.codex/plugins/cache/mattpocock/mattpocock-skills/1.3.2/skills/engineering/setup-matt-pocock-skills/SKILL.md) requires review of the tracker configuration before writing it.

The [ticket index](tickets.md) maps these plan files to the published held Beads issues. Local files are reviewable plan snapshots; Beads owns live status. Do not create a competing second issue graph.

The prior user instruction requires separate implementation authorization. Neither accepting the ticket breakdown nor configuring the tracker removes that boundary.
