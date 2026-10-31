# Oxlint and former Biome rule coverage

Oxlint 1.90.0 uses Ultracite 8.1.0's core, React, and Next.js presets. Project options preserve the former unused-binding, use-before-definition, null comparison, and new-tab link policies. Anti-slop's 18 generic rules and five Effect rules are enabled. The native accumulating-spread check is also enabled by Ultracite. Type-aware linting is not enabled; run the separate TypeScript checks for compiler diagnostics.

The [coverage manifest](biome-rule-coverage.json) retains the repository's former Biome 2.5.15 recommended baseline, React/Next domains, source mappings, and known gaps. `bun run test:tools` checks every available mapping against Oxlint's resolved configuration and verifies representative native, generic anti-slop, and Effect diagnostics. Related source mappings do not guarantee identical diagnostics or fixes.

## Remaining differences

- Oxlint does not lint CSS or JSON. Oxfmt formatting does not replace those checks.
- The prior JavaScript gaps remain recorded in the manifest. Oxlint also lacks the former Bun rules `no-undef-init`, `no-dupe-args`, and `no-octal-escape`. Strict-mode parser errors overlap with the latter two, but are not counted as full rule equivalents.
- Oxlint's precision check has no `ignoreDecimals` option, and its JSX-key check has no `checkArraysOutsideJSX` option. The corresponding checks remain enabled; these option differences are not full behavior parity.
- `eqeqeq` allows `== null`, as before. Ultracite's separate `no-eq-null` rule is disabled to preserve that deliberate exception. Unused names prefixed with underscores and hoisted function declarations remain allowed.
- Oxfmt uses Ultracite's import and package.json sorting and ES5 trailing commas. Tailwind class sorting is disabled to preserve authored class order and `cn()` merging behavior.
- Anti-slop's Effect service import rule covers relative project imports; package aliases are a current upstream limitation.
- JS plugins use Oxlint's alpha compatibility API. Oxlint and `@oxlint/plugins` are pinned to the same exact version and should be upgraded together.

## Migration boundary

This migration replaces the project-local Bun canary runner, installer, and `bunfig.toml` lint/format configuration. `bun install` now installs all tooling. The workspace scripts and read-only Codex changed-file hook invoke the installed Oxlint and Oxfmt packages through `scripts/oxc-tool.mjs`.

Ultracite and anti-slop expose existing application violations, including spacing, assertion explanations, runtime narrowing, and React patterns. Repository-wide lint and format checks can therefore fail until that source backlog is resolved. The migration does not bulk-rewrite application code or authored articles, or suppress those findings. Tooling tests verify integration independently of that backlog.

## Submission ownership guard

The two chat submission coordinators reject `Promise.withResolvers` through a scoped `no-restricted-properties` rule. Their one-shot acceptance waits belong to Effect; native Promise boundaries and test-controlled deferred responses remain supported. This is a check for a known regression, not a general proof of cancellation correctness.

`bun run test:tools` exercises rejecting and accepting fixtures with the real lint configuration and checks the actual coordinator sources for this rule and the existing Promise-constructor rule. That targeted source check remains meaningful while unrelated style diagnostics exist; the full lint check still reports and fails on them. Cleanup tests separately prove release after accepted, cancelled and unconfirmed outcomes.

CI runs lint/format, tooling tests, typechecks, application tests and the build as separate steps after a successful dependency installation. A failing lint step still fails the workflow, but no longer prevents the other checks from running. The local `bun run verify` sequence remains unchanged.
