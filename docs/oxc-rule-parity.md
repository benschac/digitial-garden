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

The application and formatting backlog is resolved against these installed versions. ESLint has no workspace dependency, configuration, or script. The `eslint/...` prefix names Oxlint's native implementations; `eslintCompatPlugin` adapts the vendored rules to Oxlint. Ultracite's optional ESLint peer supports its separate ESLint presets and does not activate ESLint here.

## Framework adaptations

The exact file overrides in `oxlint.config.mts` preserve established contracts. They are exercised by the tooling fixtures and relevant application tests:

- `Schema.TaggedError` is a curried factory, not an error constructor. Oxlint 1.90.0's `unicorn/throw-new-error` incorrectly inserts `new`; that rule is disabled only in the six owners that declare these errors. Other files still enforce error construction. Colocated schema errors and their service retain bounded per-file class counts.
- Content Collections infers transformed document types in property order. Its configuration keeps `transform` before `onSuccess` so the latter receives the compiled document type. Sorting this configuration changes TypeScript inference.
- TypeGPU `d.struct` member order defines WASM buffer offsets. Sorting those keys changes the ABI. The shader declarations retain authored order, with tests asserting frame and chunk offsets. Its compiler does not accept local object destructuring, so property access stays explicit and a transformer smoke test guards that boundary. GPU flags, shader hash operations, and Perlin noise retain native bitwise operations.
- The WASM canvas renderer has no explicitly disposable native resource; its no-op `destroy` preserves the common renderer interface.
- Canvas image roles and SVG spinner status roles describe the actual drawing element. Replacing them with generic semantic HTML would change their rendering and public props.
- The UI package index is an intentional public export boundary. App imports must still use package exports; the barrel prohibition remains active elsewhere.
- Screenshot capture retains callback Promise bridges supported by the existing browser baseline. `Promise.withResolvers` would require newer browsers; the local `promise/avoid-new` exception preserves that native API boundary.
- The prompt submission coordinator uses a one-time state initializer for stable identity. A memo would permit eviction of its active-send lock; the local `hook-use-state` exception preserves the coordinator owner.
- MDX table labeling and prompt button sizing accept arbitrary React children. Their React traversal/clone APIs remain local to those adapters. Shimmer caches dynamic motion component identities at module scope.
- Typography inspector effects deliberately restart after font, route, DOM revision, or guide changes; the force simulation restarts on Reset. These external-system dependencies remain explicit even when their values are observed indirectly through the DOM.
- Eve's overloaded session-creation adapter retains function declarations to preserve its output/input type relationship without assertions.

These scoped adaptations do not establish full Biome parity or enable type-aware linting. The coverage manifest retains those limitations.

## Tailwind editor diagnostics

`tailwindCSS.lint.suggestCanonicalClasses` belongs to Tailwind CSS IntelliSense, separately from Oxlint and Oxfmt. Its editor Quick Fix replaces a class with Tailwind's canonical spelling. Boolean data variants now use `data-placeholder:`, `data-open:`, and equivalent forms instead of bracketed spellings. Tooling tests compare generated CSS against the installed Tailwind 4.3.3 compiler. This does not sort class lists or change attribute-value variants such as `data-[state=open]:`.

## Library source checks

Effect 4.0.5 was checked against the source mirror at `7f524e25cfb49a71ac39b0f44278d08d40dda5de` with `bun run sources:check`. The installed instructions and matching schema, resource acquisition, service composition, and managed-runtime examples were read alongside `Schema.ts`, `Predicate.ts`, `ManagedRuntime.ts`, and `internal/effect.ts`, with the matching Schema, Predicate, Effect, Scope, and ManagedRuntime tests.

`Schema.TaggedError` returns a class factory and must remain a call. The database's default Layer remains lazy; each `ManagedRuntime` keeps its own memo map and disposal scope. Its failure-sensitive cache still expires failures and retains successful initialization. The existing database and renderer tests cover concurrent initialization, retries, late acquisition, and disposal. The watcher keeps its scoped queues, serialized builds, and shutdown cleanup. Changing function names and service signatures does not replace these owners.

The Giotto boundary validates its document envelope through `StructWithRest`, retaining provider fields. Native fetch remains under the existing React abort owner after comparing the installed HTTP-client capabilities. Predicate checks narrow already-owned runtime values; external WASM exports and diagram documents retain explicit validation.

React's installed external-store implementation and server snapshot behavior support the preference and visibility subscriptions. SSR tests check the default font snapshot. The development `/style-boundaries` fixture reports PASS in the native browser at desktop width and a 390px responsive viewport. Interactive persistence, observer behavior, diagram playback, and GPU drawing still require fuller browser acceptance. Compilation and source inspection alone do not establish those outcomes.
