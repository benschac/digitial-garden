# Project pattern rules

`service-execution` applies only to application `*-service.ts` modules. It resolves the lexical binding of named `Effect` imports from `effect` and rejects access to execution helpers, including the context-provided `*With` runner variants, import aliases and string-literal computed properties. Local shadowed names and imports from other packages are permitted. Existing native import restrictions cover runtime modules and direct runner imports.

This is a project-owned implementation of the composable-service boundary discussed by the meeeeed brain and Rat Stack. It does not copy their plugin implementation or Cloudflare-specific ownership rules. The installed `@oxlint/plugins` 1.90.0 supplies the rule and plugin APIs; real CLI fixtures live in `scripts/pattern-boundaries.test.mjs`.

Effect 4.0.5's pinned `ai-docs/src/04_integration/10_managed-runtime.ts` places execution at the foreign framework boundary. `packages/effect/src/ManagedRuntime.ts` owns memoized services and disposal; `packages/effect/test/ManagedRuntime.test.ts` checks memoization and fiber interruption on disposal. Locally, `sample-db-service.ts` composes work and `sample-db.ts` owns the runtime.

This syntax rule does not track destructuring, reassigned aliases, computed variable properties, wrappers, or whole-program execution flow. Those remain review concerns. It does not prohibit runtimes in integration owners or claim that lifecycle cleanup is correct.
