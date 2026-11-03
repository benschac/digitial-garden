# Library source references

Use these checkouts to verify library behavior when a skill, example, or documentation page may be outdated. The tracked manifest is [`scripts/agent-sources.json`](../scripts/agent-sources.json). It records exact package versions, upstream tags, and immutable commits; downloads live in the ignored root `.agent_sources/` directory.

| Reference | Version | Local source |
| --- | --- | --- |
| Effect | 4.1.2, matching the web dependency | `.agent_sources/effect/packages/effect/` |
| XState Effect | 1.0.0-alpha.10, matching the web dependency | `.agent_sources/xstate-effect/packages/xstate-effect/` |
| XState core | 6.0.0-alpha.71, same checkout | `.agent_sources/xstate-effect/packages/core/` |

The web package separately declares these exact Effect, XState core and XState Effect runtime dependencies. The source commands only maintain reference checkouts: downloading source does not install runtime dependencies or execute upstream lifecycle scripts. Root-level mirrors are outside the workspace build, typecheck, and application-test directories; Git, Oxlint, and Oxfmt ignore them. Use the workspace test scripts rather than recursively running tests from the repository root.

## Git ownership and downloaded documentation

Commit the source manifest, downloader, tests, package scripts, ignore rules, and project guidance. Do not commit `.agent_sources/`: it is a reproducible local cache containing upstream Git repositories. A fresh checkout populates it with `bun run sources:fetch`. No submodule or runtime dependency is required.

The downloads include version-matched documentation:

- Effect: `.agent_sources/effect/README.md`, `.agent_sources/effect/ai-docs/README.md`, and examples under `.agent_sources/effect/ai-docs/src/`. Continue to read `apps/web/node_modules/effect/AGENTS.md` for the installed package's instructions.
- XState core: `.agent_sources/xstate-effect/packages/core/README.md` and tests under that package.
- XState Effect: `.agent_sources/xstate-effect/packages/xstate-effect/README.md` and `docs/quick-start.md`.
- The bridge's `docs/` also includes actors, observing actors, Effect logic, schemas/actions, testing/errors, matching states, and React/atoms guides.

These are upstream files at the manifest's exact commits, not a separate scrape of the live documentation website.

## Commands

```sh
bun run sources:fetch
bun run sources:check
bun run sources:updates
```

`fetch` downloads missing mirrors and validates existing ones. `check` validates locally without fetching. Both reject mismatched source versions, commits, origins, metadata, or dirty checkouts. Each download records its source identity and retrieval date in `.agent-source.json`.

`updates` queries official npm distribution tags and reports them alongside our reference versions. It does not install packages, change pins, or refresh source. Read release notes and source changes before selecting an update. To change a reference, update its manifest version, tag, and commit together, preserve or move aside the old mirror, then fetch and check again. The tool never deletes an existing checkout to refresh it.

## XState Effect compatibility

The [Stately quick-start](https://stately.ai/docs/xstate/v6/effect/quick-start) describes scoped actors and Effect-hosted work. Read the pinned bridge's README, source, and tests before implementing its examples.

At setup on 2026-10-31, npm's `@xstate/effect` `alpha` tag resolved to `0.1.0-alpha.4`, while `latest` resolved to `1.0.0-alpha.10`. The quick-start's `effect@rc` installation advice therefore does not describe this project's stable Effect 4 pin. The selected bridge declares Effect `^4.0.0` and XState `^6.0.0-alpha.71` peers; Effect 4.1.2 fits that declared range. Both selected XState packages share commit `8cf3f00b41984a32ce935db117f52b628cfcd5ac`.

The pinned bridge README uses `createEffectLogic`, and its `src/index.ts` exports that API rather than the quick-start's `fromEffect`. Follow the pinned source when adapting the example.

These checks establish source identity and declared peer compatibility; application integration requires its own tests. XState v6 and its Effect bridge remain prereleases. Compare both `latest` and `alpha` when checking updates; a channel name does not establish which version is newer.

## Reading order

1. Read repository instructions and the installed library's instructions, when available.
2. Run `sources:check`; inspect the pinned implementation, exported types, and relevant tests.
3. Use skills and official documentation to guide the investigation. Report API discrepancies against the pinned source.
4. Check upstream releases separately when assessing upgrades. Never substitute upstream HEAD for the version whose behavior the application depends on.

The workflow adapts rat-stack's [source-first guidance](https://ratstack.sh/AGENTS.md) and [source mirror utility](https://github.com/joelhooks/rat-stack/blob/main/scripts/vendor-agent-sources.sh).

## Effect 4.1.2 qualification

The source review compares `effect@4.0.5` at `7f524e25cfb49a71ac39b0f44278d08d40dda5de` with `effect@4.1.2` at `506eef143bcc1750ce58920aac1e45da7265d103`. The installed `AGENTS.md` matches upstream `LLMS.md`; these instructions and the cataloged examples are unchanged across the two tags. The review retains all ten Effect-dependent catalog decisions, exceptions, and verification gaps.

| Catalog decisions | Target source behavior reviewed | Application checks |
| --- | --- | --- |
| `resource-ownership`, `replaceable-resources`, `process-ownership` | `Scope.ts`, `internal/effect.ts`, and `Scope.test.ts` retain acquisition finalizers and late cleanup. Parallel close avoids waiting on its own fiber. A second scope close still returns before an earlier asynchronous close finishes. | `renderer-lifecycle.test.ts`, `wet-ink-resources.test.ts`, `social-preview-lifecycle.test.ts` |
| `actor-lifecycle` | The unchanged XState bridge owns its actor scope and awaits invoked task cleanup. Effect's scope behavior remains compatible with that owner. | `particle-lifecycle.test.ts` |
| `runtime-boundary`, `adapters-cartridges` | `ManagedRuntime.ts` and its tests add waiting for overlapping disposal. `Layer.ts` memoizes composed builds. The database facade retains its disposal Promise and retries initialization inside its service. | `sample-db.test.ts`, `social-preview-lifecycle.test.ts` |
| `shared-requests` | `Cache.ts` is unchanged. Its tests cover zero TTL, shared waiters, and interruption after the final waiter leaves. The injected Promise transport remains an intentional boundary. | `typography-metric-requests.test.ts` |
| `submission-acceptance`, `typed-failures` | `internal/effect.ts` and `Effect.test.ts` preserve single callback settlement, interruption cleanup, and typed Promise rejection mapping. Defects remain distinct from recoverable failures. | `prompt-input-attachments.test.ts`, `agent-chat-submission.test.ts`, `typography-metric-requests.test.ts` |
| `validated-input` | `Schema.ts` and schema tests retain finite-number validation, positive numeric checks, optional fields, and synchronous decoding. | `typography-metrics-schema.test.ts` |

Upstream 4.1 removes `effect/Crypto` in favor of `effect/crypto/*`. The application has no imports of the removed module, so this qualification requires no API adaptation. The source mirror and package declaration move together; XState pins remain unchanged.

Source inspection and application tests do not establish browser rendering, physical GPU behavior, provider delivery, process-tree behavior, or host shutdown wiring. Those catalog gaps remain explicit. Independent review and full repository verification remain required before integration.

## Pattern invalidation on upgrades

The [pattern catalog](../agent-patterns/catalog.md) records the source commit supporting each library-dependent decision. Before changing a pin, run `bun run patterns affected effect` or `bun run patterns affected xstate-effect` to enumerate the decisions to revisit. This command remains available when recorded evidence is stale. After changing a pin, `patterns:check` fails until the corresponding catalog evidence matches the manifest; do not update commits mechanically. Read the changed upstream documentation, implementation, and tests, adjust the local decision where necessary, and run its behavioral checks.

`bun run patterns:check` runs in the verification fence without requiring downloaded mirrors. `bun run patterns:check-sources` additionally checks mirror provenance and the cited upstream files. Missing mirrors require `sources:fetch`; dirty or mismatched mirrors remain protected by the existing source workflow. Neither command fetches documentation or upgrades dependencies.
