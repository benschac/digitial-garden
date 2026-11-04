# TSRS lint evaluation

Research date: 2026-11-04. Recommendation: try TSRS as the backend for added type-aware linting while retaining the existing Oxlint rules. The owner welcomes experimentation and some tooling churn on this personal site; experimental status alone is not a reason to defer a useful trial. `bun run lint:typed` now runs in normal verification. The policy and fresh diagnostic review are recorded below; the initial trial counts are historical.

## What the announcement means

Mattia Manzati's [announcement](https://x.com/MattiaManzati/status/2117933990246232387) concerns `tsrs --lint`, a replacement for Oxlint's type-aware **tsgolint backend**. It does not replace the Oxlint frontend, ordinary syntax rules, or JavaScript plugins. The tweet text was retrieved through the public FxTwitter metadata endpoint; the implementation below independently confirms its meaning.

The [Effect integration changelog](https://github.com/Effect-TS/tsgo/blob/ed1b917e8ddd717b7172ffa51e1b583c513c6df6/_packages/tsgo/CHANGELOG.md) introduces `--tsrs-lint` in **@effect/tsgo 0.67.0**, bundling TSRS **0.21.0-ts7.1.0-beta**. The npm registry reported **0.67.1** as latest during research. The repository initially used **0.63.0**, which cannot use this flag; the implemented trial below upgrades it.

The upstream invocation is:

```sh
effect-tsgo --tsrs-lint oxlint --type-aware
```

The [pinned README](https://github.com/Effect-TS/tsgo/blob/ed1b917e8ddd717b7172ffa51e1b583c513c6df6/README.md) explicitly labels this mode experimental. It retains the installed Oxlint CLI and selects the Effect-patched TSRS backend. It does not require an installed `oxlint-tsgolint`. Oxlint 1.90.0, used here, is in that release's supported matrix. The bridge supports Node and Bun; packaged TSRS/Oxlint builds exclude Linux musl, and TSRS does not implement tsgolint's Go profiling environment variables.

## Coverage and maturity

- TSRS's [compatibility evidence](https://github.com/oxc-project/tsrs/blob/6ff1ff6723e45ec63e86796a880db3d3c6e41df1/docs/COMPATIBILITY.md) reports 61/61 pinned tsgolint rules, 7,933 active imported case inputs, and 28 upstream skips. These are upstream-reported results, not locally rerun verification. [The rule inventory](https://github.com/oxc-project/tsrs/blob/6ff1ff6723e45ec63e86796a880db3d3c6e41df1/testdata/lint/PROGRESS.md) records its tsgolint 7.0.2005 reference and rule-level evidence.
- Effect's [Rust adapter](https://github.com/Effect-TS/tsgo/blob/ed1b917e8ddd717b7172ffa51e1b583c513c6df6/crates/ets_tsrs/src/lint.rs) registers `effecttsgo/` rules with the TSRS lint registry and translates diagnostics and suggestions. Its [proxy tests](https://github.com/Effect-TS/tsgo/blob/ed1b917e8ddd717b7172ffa51e1b583c513c6df6/_packages/tsgo/test/proxy.test.ts) cover backend selection, supported hosts, version errors, and flag placement before `oxlint`/`vp`.
- TSRS targets TypeScript 7.1 beta. The compatibility document acknowledges compiler-version, checker-history, and corpus-order differences. Full equivalence on this repository is unproven. Upstream suite coverage does not establish compatibility with every local rule, ignore, fix, or plugin configuration.

## Performance evidence

An upstream [VS Code lint benchmark](https://github.com/oxc-project/tsrs/blob/6ff1ff6723e45ec63e86796a880db3d3c6e41df1/notes/bench-tsgolint-vscode-rebased.md), dated 2026-10-15, compared the same Oxlint 1.88.0 frontend with Rust and Go backends across 9,324 paths and 60 rules. On an M2 Max, five-run medians were **12.355 s versus 20.214 s** for full lint commands, a **1.64×** speedup. The isolated backend showed larger gains, but that is not whole-command performance. The report explicitly records differing diagnostic counts and compiler/rule versions. It predates this Effect integration and is not a benchmark of this repository.

No local speedup is established. This repository's default lint command does not enable type-aware mode, so replacing a backend it does not currently run cannot directly accelerate that command. Compiler benchmark results also cannot be substituted for lint measurements.

## Repository decision and a bounded future trial

Keep Oxlint, Ultracite presets, and the 23 custom anti-slop rules. They own existing syntax and architectural checks. TSRS backend support alone provides no evidence that removing those checks preserves coverage. The project already has an optional TSRS Effect checker; its current failures are a reason to keep that checker optional, not proof that the newer lint-only backend fails.

The coordinator consulted the project's `lint` and `behavioral-verification` patterns and Rat Stack's `lint-rule-limits` guidance. The decision they change is to preserve existing static checks and require concrete diagnostic/fixture evidence before any replacement claim.

A future trial should use isolated, pinned dependencies for @effect/tsgo 0.67.1 and TSRS 0.21.0-ts7.1.0-beta, retain the current lint configuration, and explicitly select type-aware and Effect rules. Compare patched Go and TSRS backends on the same files and rules before timing repeated runs. Review diagnostic severity, locations, suppression behavior, exit codes, and proposed fixes without applying fixes. Keep the existing lint and typecheck gates until that comparison establishes acceptable behavior. Adding type-aware rules is a coverage change and should be evaluated separately from backend speed.

The initial research changed no dependencies, scripts, lint configuration, or production state; the subsequent implementation is recorded below. Upstream tests and benchmark runs were inspected, not executed locally.

## Baseline validation before the upgrade

Before the upgrade, the installed manifest and lockfile both resolved `@effect/tsgo` 0.63.0. Its TSRS executable reports `0.20.1-ts7.1.0-beta`; its CLI source does not contain the new `--tsrs-lint` flag.

`bun run check-types:effect` was rerun during this evaluation and exited 2 after successful route/content generation. It reported four TS2615 circular content-AST mapped-type errors, Effect warnings, and `missingReturnYieldStar` at `apps/web/src/components/mdx/animated-diagram-lifecycle.ts:191`. These are observations of the existing optional checker, not results from the new lint backend.

## Implemented trial

`@effect/tsgo` is pinned to 0.67.1, with TSRS explicitly selected at 0.21.0-ts7.1.0-beta. The existing optional compiler command uses that supported version too. `lint:typed` generates route/content types before linting `apps`, `packages`, and `gascity`. It does not run compiler diagnostics via `--type-check`.

`oxlint.typed.config.mts` spreads the base configuration to preserve relative JavaScript plugin resolution, overrides, and rules, then extends Effect's public recommended preset. Nesting the entire base config under `extends` was rejected by Oxlint because its JavaScript plugin paths are relative. Existing Ultracite typed rules activate automatically in type-aware mode.

The first completed trial exited 1 with 1,097 diagnostics, including Effect diagnostics and many previously dormant Ultracite rules. These are untriaged findings, not 1,097 confirmed defects. JavaScript test files also produced error-type diagnostics, so their project/type context needs review. No suppressions or automatic fixes were applied. At that stage, the command remained outside default verification pending triage.

Implementation evidence: installed 0.67.1 README, preset exports and types, plus the pinned upstream proxy resolver and tests linked above. The source-backed backend selection and real execution establish wiring; no local performance or diagnostic parity claim is made.

## Lint policy and verification integration

A fresh `bun run lint:typed` on 2026-11-04 exited successfully with zero errors and five `effecttsgo/unstable-api-usage` warnings across 226 files. The initial 1,097 diagnostics do not describe this checkout. The fresh run demonstrated no correctness defects or missing TypeScript project context requiring application rewrites.

All five warnings concern Effect HTTP APIs in `animated-diagram-lifecycle.ts` and its tests. Effect 4.1.2 marks those APIs unstable, but its HTTP-client guide recommends this transport and schema-decoding approach. The application tests cover status failures, malformed JSON, schema failures, and cancellation. Retain the APIs and visible warnings; instability is a compatibility risk, not evidence of incorrect behavior.

The Promise policy is explicit:

- Disable `require-await` and keep `typescript/require-await` disabled. An async API may perform synchronous work while preserving Promise returns and converting throws into rejections.
- Keep `typescript/promise-function-async`. It continues to enforce a consistent async boundary for Promise-returning functions, with the existing narrow method exceptions preserved.
- Set `typescript/return-await` to `error-handling-correctness-only`. Require awaiting where omission would bypass error handling, while allowing either form elsewhere.
- Retain `no-floating-promises`, `no-misused-promises`, `await-thenable`, unsafe-operation checks, and recommended Effect diagnostics.

The content helpers and inspected async test doubles no longer need nested `Promise.try` calls. Publication filtering, MDX construction, and thrown errors are unchanged. Removing the redundant Promise adoption also removes its extra microtask delay.

`lint:typed` delegates to Turbo's root `lint:typed:root` task. That task depends on `@personal-site/web#typegen`, so normal verification shares generated route and content prerequisites. Its inputs cover application, shared-package and Gas City code, TypeScript project configuration, both lint configurations, custom plugins, manifests, the lockfile, and ignore policy. Generated directories are excluded from direct inputs and restored through the prerequisite's cached outputs. Compiler diagnostics remain owned by the existing typecheck tasks.

`scripts/typed-lint.test.mjs` runs the actual configured linter against accepted async APIs and rejected Promise/Effect misuse. `scripts/verification.test.mjs` checks affected selection, generation order, shared-source invalidation, and cached generation restoration. These fixtures protect against disabling typed enforcement or reintroducing contradictory async rules.

Source consultation used the `behavioral-verification` pattern and [Rat Stack lint-rule limits](https://ratstack.sh/resources/lint-rule-limits). Their concrete effect was to test rejection behavior and task selection rather than infer enforcement from a successful command. Installed Ultracite 8.1.1 owns the inherited Promise rules; Oxlint 1.90.0's configuration schema defines the selected return-await mode. No dependency upgrade or diagnostic parity claim is part of this cleanup.
