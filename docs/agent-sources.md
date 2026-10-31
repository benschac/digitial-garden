# Library source references

Use these checkouts to verify library behavior when a skill, example, or documentation page may be outdated. The tracked manifest is [`scripts/agent-sources.json`](../scripts/agent-sources.json). It records exact package versions, upstream tags, and immutable commits; downloads live in the ignored root `.agent_sources/` directory.

| Reference | Version | Local source |
| --- | --- | --- |
| Effect | 4.0.5, matching the web dependency | `.agent_sources/effect/packages/effect/` |
| XState Effect | 1.0.0-alpha.10, reference only | `.agent_sources/xstate-effect/packages/xstate-effect/` |
| XState core | 6.0.0-alpha.71, same checkout | `.agent_sources/xstate-effect/packages/core/` |

XState core and XState Effect are not installed as runtime dependencies by these commands. Downloading source does not execute upstream package installation or lifecycle scripts. Root-level mirrors are outside the workspace build, typecheck, and application-test directories; Git, Oxlint, and Oxfmt ignore them. Use the workspace test scripts rather than recursively running tests from the repository root.

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

At setup on 2026-10-31, npm's `@xstate/effect` `alpha` tag resolved to `0.1.0-alpha.4`, while `latest` resolved to `1.0.0-alpha.10`. The quick-start's `effect@rc` installation advice therefore does not describe this project's stable Effect 4 pin. The selected bridge declares Effect `^4.0.0` and XState `^6.0.0-alpha.71` peers; Effect 4.0.5 fits that declared range. Both selected XState packages share commit `8cf3f00b41984a32ce935db117f52b628cfcd5ac`.

The pinned bridge README uses `createEffectLogic`, and its `src/index.ts` exports that API rather than the quick-start's `fromEffect`. Follow the pinned source when adapting the example.

These are source and declared peer-compatibility checks, not an application integration test. XState v6 and its Effect bridge remain prerelease references. Compare both `latest` and `alpha` when checking updates; a channel name does not establish which version is newer.

## Reading order

1. Read repository instructions and the installed library's instructions, when available.
2. Run `sources:check`; inspect the pinned implementation, exported types, and relevant tests.
3. Use skills and official documentation to guide the investigation. Report API discrepancies against the pinned source.
4. Check upstream releases separately when assessing upgrades. Never substitute upstream HEAD for the version whose behavior the application depends on.

The workflow adapts rat-stack's [source-first guidance](https://ratstack.sh/AGENTS.md) and [source mirror utility](https://github.com/joelhooks/rat-stack/blob/main/scripts/vendor-agent-sources.sh).
