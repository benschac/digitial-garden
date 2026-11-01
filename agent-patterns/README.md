# Library source lookup workflow

Implementation agents and reviewers must use this workflow for work involving Effect, XState, or their framework integrations, including custom adapters that might duplicate a library capability. Read upstream documentation and examples from the matching source checkout; keep this directory procedural rather than copying API recipes here.

Use the [pattern catalog](catalog.md) to find project decisions by concern: `bun run patterns search cancellation`, then `bun run patterns show <id>`. Entries link owners, upstream files, checks, exceptions, and related concerns. The catalog routes this workflow; it does not replace source reading. `bun run patterns list --json` exposes the same records to agent tooling without a separate knowledge store or server.

## Before implementation

1. **Name the concern and owner.** Identify the behavior being changed and its application owner. Check the [standard-library directory](../docs/standard-libraries.md) and existing exports first. Search by the concern, such as HTTP, caching, retries, subscriptions, or resource lifetime, before choosing a low-level wrapper.
2. **Establish source identity.** Inspect the consuming package manifest, lockfile and installed package version. Follow [source setup](../docs/agent-sources.md) to populate missing mirrors, then run `bun run sources:check`. Resolve a mismatch before relying on the mirror. The [source manifest](../scripts/agent-sources.json) owns exact versions and commits; a retained installation or source checkout does not authorize adding a dependency.
3. **Read the upstream guidance.** Read the installed library instructions and follow the relevant documentation/example links. Search the whole package's public exports and source tree, including subpaths, for the concern. Finish with a library capability found, or the searched locations and why no suitable capability exists.
4. **Verify behavior against source.** Read the candidate's implementation, types and relevant upstream tests. Establish the success, failure, cancellation and resource-ownership behavior needed by the caller. Check framework and platform boundaries against their actual owner; an API's existence alone does not establish a fit.
5. **Implement and verify the smallest adaptation.** Reuse the existing application owner. Typecheck the selected imports and test the behavior that motivated the change, including relevant failure and cleanup paths. If upstream tests are missing or insufficient, state that and add a focused application test. Keep upstream mirrors reference-only.

Effect is already version 4 in this project. Search the installed v4 package and its matching checkout for all relevant capabilities; do not limit discovery to core exports or remembered APIs. The exact resolved v4 release still matters: a newer website example can differ from the installed source. Checking upstream releases is a separate task and does not authorize an upgrade.

## Where to look

| Library | Start here | Follow through to |
| --- | --- | --- |
| Effect | `apps/web/node_modules/effect/AGENTS.md` and its linked `ai-docs/src` examples | Installed `package.json` exports and `src`; `.agent_sources/effect/ai-docs/src`, `packages/effect/src`, and `packages/effect/test` |
| XState core | `.agent_sources/xstate-effect/packages/core/README.md` | That package's exports, `src`, and `test` |
| XState Effect | `.agent_sources/xstate-effect/packages/xstate-effect/README.md` and `docs` | That package's exports, `src`, and colocated tests |

These are navigation entry points, not a capability whitelist. Discover additional modules and documentation with `rg --files` against the explicit source directory, then search the concern with `rg -n`. Follow related upstream links when they affect the decision; resolve paths relative to the upstream document. If a path moves, rediscover it through the verified checkout instead of copying a stale recipe.

For an HTTP change, the lookup must include Effect's linked HTTP-client guide and `effect/http` exports before choosing a handwritten fetch adapter. Read the matching implementation and tests for status handling, body decoding and interruption. For a framework-owned transport, inspect that framework's contract before substituting a client. This is a lookup example, not a blanket migration rule.

## Required implementation handoff

Include this compact evidence in the task result and PR description, grouped when several changes share the same decision:

- **Source:** resolved package version and mirror commit; documentation/example, implementation and test paths actually read, with relevant symbols or line references. Use repository-relative paths or immutable upstream links, not a personal machine's absolute paths.
- **Decision:** application owner, capability considered, and the source behavior that supports adoption or explains retaining the existing approach. Identify any source/documentation discrepancy.
- **Verification:** relevant application test and result; report missing upstream coverage, unavailable sources and unverified host/platform behavior explicitly.

Record evidence for each distinct library-dependent decision, not every import. A list of filenames without the behavior they establish is incomplete. Keep the evidence with the change rather than maintaining another API guide.

## Independent review and completion gate

Reviewers must perform the lookup themselves against the submitted patch and its target dependency versions. Open the cited documentation, implementation and tests; independently search for a higher-level capability that could replace custom coordination. Check that the evidence describes the code being reviewed, not just an API with a familiar name.

For each relevant decision, the review result must state the source behavior checked, whether the application preserves it, and the behavioral test supporting that conclusion. Distinguish defects from optional simplifications and intentional framework adaptations. Missing sources or behavior tests must remain explicit gaps; source identity checks and compilation alone do not prove correct lifecycle behavior.

The coordinating agent must include this workflow and its handoff requirements in implementation and review assignments, and supply reviewers the same stable patch and acceptance criteria. Before marking work ready or submitting/updating a PR, it must obtain missing evidence, resolve actionable review findings, and run the repository verification fence. Any unresolved gap or failed check must be reported; the coordinator must not describe that work as fully verified.

`sources:check` validates provenance, not whether an agent read or understood a file. This workflow makes consultation a required, reviewable completion condition; automated checks and behavioral tests remain separate evidence. Preserve repository-specific owners and exceptions in the standard-library directory, while upstream documentation, examples and tests remain in the ignored source mirrors.
