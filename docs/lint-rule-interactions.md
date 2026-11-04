# Lint and formatting interaction audit

Checked 2026-11-04 with Oxlint 1.90.0, Oxfmt 0.75.0, Ultracite 8.1.1, and Effect's TSRS integration 0.67.1. This is evidence for the checked configurations and examples, not proof that every possible program is free of conflicting diagnostics.

## Corrected conflicts

- `typescript/non-nullable-type-assertion-style` recommended `value!` for a nullable value asserted to a non-null type, while `typescript/no-non-null-assertion` prohibited that replacement. Disable the advice rule; unsafe assertions and non-null assertions remain rejected. Explicit narrowing passes.
- `typescript/use-unknown-in-catch-callback-variable` requires an unknown rejection parameter. The custom `anti-slop/no-unknown-parameters` permits the name `cause` for that boundary, while `unicorn/catch-error-name` normally requires `error`. Allow exactly `cause` through the naming rule's `ignore` option. Retain the unknown-parameter and rejection-type checks.

The real-runner fixtures in `scripts/typed-lint.test.mjs` accept a narrowing rejection handler, explicit undefined narrowing, and a braced void callback. They reject unsafe assertions, non-null assertions, untyped rejection callbacks, and unrelated unknown parameters. These cases prevent the contradictory advice from returning without weakening the underlying safety checks.

## Other interactions checked

- Import ordering belongs to Oxfmt; Ultracite disables `sort-imports`. Import spacing and the custom readable-spacing rule coexist with the formatter.
- Oxfmt owns quotes, semicolons, indentation, wrapping, and trailing commas. Its package.json sorting does not compete with JavaScript object-key linting. Tailwind class sorting is explicitly disabled to preserve authored class order.
- `no-confusing-void-expression` can reject shorthand callbacks, but a braced callback satisfies the active rules. This is a style restriction, not an unavoidable contradiction.
- Core/TypeScript rules for implied eval and Promise rejection errors overlap without a demonstrated disagreement.
- The previous async-wrapper conflict remains covered by the existing synchronous-async API and rejection-handling fixtures.

In an isolated temporary copy, two successive rounds of safe Oxlint fixes followed by Oxfmt left all 249 copied tracked JavaScript/TypeScript source files unchanged. The final syntax-lint run reported zero diagnostics. This checks the current source corpus; it does not establish typed-fixer or arbitrary-input convergence.

## Evidence and limits

The audit read the resolved base and typed configurations, installed Ultracite presets, Oxlint's option schema, and the custom rule implementation at `tools/oxlint/anti-slop/rules/no-unknown-parameters.ts`. `bun run patterns consult lint` and the previously consulted `lint-rule-limits` reference informed the decision to require concrete rejected/accepted examples rather than infer conflicts from rule names.

The installed `@oxlint/plugins` is 1.91.0 while Oxlint is 1.90.0. That is existing dependency drift from the repository's documented version-pairing convention, not a demonstrated rule conflict. This audit does not upgrade either dependency. Existing framework exceptions remain in place. No repository-wide absence of future conflicts is claimed.

## Effect error ownership

Effect's semantic rules take precedence inside Effect operations. Seven TSRS checks are errors: constructor-local error mapping, unknown/global-Error mapper results, native try/catch inside Effect generators, nested Effect execution, lazy Promises in Effect.sync, and accidental Promise success values. These rules resolve Effect APIs/types, so ordinary framework callbacks are not treated as Effect programs merely because their file imports Effect. Requiring constructor-local mapping is a deliberate project policy; shorthand Effect.try/tryPromise is valid upstream but produces a generic unknown error.

The syntax rule `project-patterns/promise-recovery` rejects static `.catch` member access/destructuring and two-argument `.then` calls in application, package, and Gas City code. Imported Effect.catch remains permitted, including import aliases, namespace imports and shadowing checks. Effect.tryPromise's object `catch` mapper is also permitted. Non-null assertions remain explicitly forbidden.

Native Promise recovery is permitted outside recognized Effect callbacks in these reviewed files:

| File | Boundary responsibility |
| --- | --- |
| `apps/web/scripts/dev-port.ts` | Drain the aborted Node socket-listening Promise after synchronous listen failure. |
| `apps/web/scripts/social-preview-native.ts` | Poll Chromium's DevToolsActivePort file while the external process starts. |
| `apps/web/src/app/article-content-overlay.tsx` | Handle unavailable font resolution in React's DOM measurement lifecycle. |
| `apps/web/src/app/typography-inspector.tsx` | Handle unavailable font resolution in the inspector lifecycle. |
| `apps/web/src/app/_components/agent-chat-submission.ts` | Settle Eve UI startup on either Promise outcome. |

Test harnesses have the same boundary allowance. Even those files reject native recovery lexically inside recognized Effect constructors/operators, including gen, named fn, and map callbacks. Future boundary additions require an owning API and an accepted/rejected fixture. Whole-file exceptions do not prove every future function in that file is an appropriate boundary.

`promise/valid-params` mistakenly treats valid `Effect.catch(effect, handler)` as an invalid two-argument Promise.catch. It is disabled only for the declared Effect modules in the base configuration. TypeScript remains responsible for their call signatures; the generic rule stays active elsewhere. The typed fixture accepts data-first Effect.catch. Other generic Promise safety checks remain active.

Six shorthand Effect constructors in code highlighting and diagram initialization now map failures to Schema.TaggedError classes, retaining the original cause and operation. UI fallback, cancellation, retry and resource ownership stay with the existing owners.

### Source and verification evidence

- Effect 4.1.2, mirror `506eef143bcc1750ce58920aac1e45da7265d103`: creating-effects and ManagedRuntime guides, `packages/effect/src/internal/effect.ts` tryPromise implementation, and `packages/effect/test/Effect.test.ts` mapper tests establish typed mapping for throws/rejections and defects for a throwing mapper. `typed-failures` and `runtime-boundary` are the consulted local decisions.
- `@effect/tsgo` 0.67.1, upstream `ed1b917e8ddd717b7172ffa51e1b583c513c6df6`: matching rule documentation, Rust implementations in `crates/ets_rules/src`, and Effect v4 fixtures in `testdata/tests/effect-v4` establish semantic rule scope. The upstream tests were inspected, not rerun locally.
- `scripts/pattern-boundaries.test.mjs` checks rejection and boundary exceptions, import aliases, shadowing, and direct/computed/optional calls. `scripts/typed-lint.test.mjs` checks blocking Effect diagnostics, valid typed mapping, and continued non-null assertion rejection.
- Existing highlighting and diagram tests cover fallback, retries, cancellation and cleanup; one additional regression catches synchronous tokenization failure being retained instead of retried.

This is bounded static enforcement, not a whole-program Promise graph. Assigned/re-exported Effect aliases, dynamic member keys, extracted then callbacks, cross-file helpers, and native await/try-catch outside recognized Effect contexts still require review. Other objects named catch are conservatively treated as needing a boundary declaration. The rule does not claim that all unknown values can disappear: unknown enters at foreign interfaces and is mapped before application recovery.
