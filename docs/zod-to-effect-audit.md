# Zod-to-Effect migration audit

Audited 2026-10-29 against HEAD `f1ae7e9ba00718cf30ee46b9373318c6e43521b0` and the existing working tree. Installed Effect version: `4.0.5`, declared by `apps/web/package.json:57`. This is an audit, not a migration implementation.

## Summary

There are **no remaining direct first-party Zod migration targets** in the reviewed source, tests, scripts, or workspace dependency declarations. Runtime schemas already use Effect Schema. Zod remains in the lockfile through external dependencies and peer requirements. Replacing an application schema cannot remove those upstream requirements.

The useful next step is to preserve the existing Effect integrations and evaluate upstream dependency changes separately. Do not replace working libraries, remove lockfile entries manually, or add Effect to shared packages just to reach a zero-Zod dependency graph.

All three segment reviews are complete and reconciled. Straightforward first-party replacements remaining: **0**. Existing adapter-dependent sites are already migrated. Broader upstream refactoring remains conditional, with no compatible Zod-free upgrade established.

## Review coverage

The coordinator searched the repository for Zod imports and references, schema constructors, parser calls, inferred types, wrappers, and dependency declarations. Three reviewers were assigned disjoint segments through intercom in separate terminal splits. Only the coordinator writes this report.

| Segment | Assigned reviewer | Scope |
| --- | --- | --- |
| Content pipeline | `schema-content-audit` | `apps/web/src/lib/content/**`, `apps/web/content-collections.ts`, `apps/web/content/**`; trace generated registry consumers for schema contracts |
| Remaining web app | `schema-app-audit` | All other `apps/web/**`, including Eve tools, runtime boundary schemas, app configuration, scripts, and tests |
| Workspace and dependencies | `schema-dependencies-audit` | `packages/**`, root `scripts/**`, root configuration and manifests, documentation/tooling references, and all workspace dependency declarations plus `bun.lock` |

All three reviewers returned completed reports through intercom. Their terminal splits were `wA:p6`, `wA:p7`, and `wA:p9`, respectively. The dependency reviewer used a private working directory while inspecting this repository read-only.

Shared contracts were traced across these review boundaries, not independently reimplemented. The content reviewer owns the content schemas; the app reviewer owns the SQL-tool adapter; the workspace reviewer owns residual dependency paths. Both source reviewers confirmed no direct Zod usage in their assigned segments.

Workspace no-op coverage is explicit:

- `packages/ui/**`: 63 tracked files, including controls, utilities, stories, and Storybook configuration. No Zod usage or Effect Schema owner.
- `packages/react-hooks/**`: 8 tracked files, including lifecycle hooks, exports, and configuration. No Zod usage or Effect Schema owner.
- `packages/wasm-canvas-engine/**`: 6 tracked files, including Cargo metadata and four Rust modules. No Zod usage; the JavaScript ABI validator remains app-owned.
- Root `scripts/**`: 7 MJS files. Native hook JSON parsing in `scripts/check-changed.mjs:12` is not leftover Zod. Root scripts, UI, and hooks do not declare either Zod or Effect. Root configuration, manifests, hidden tooling configuration, and app scripts/configuration likewise contain no executable Zod schema to replace.

Introducing Effect to these shared or bootstrap packages would be a new dependency and ownership decision, not completion of an existing Zod migration.

Excluded as migration targets: dependency implementation, generated content and Next output, build caches, generated WASM/JavaScript bindings, artwork, and vendored code. Installed dependency source is inspected only to establish the contracts and ownership of integration requirements. Prose and agent-skill references are classified separately from executable usage.

## Existing Effect Schema owners

These are completed adoption sites, not a proposed replacement backlog.

### Blog frontmatter and documents

- Owner: `apps/web/src/lib/content/schema.ts:32`, `metadataSchema`; `:79`, `postMetadataSchema`; `:81`, `postDocumentSchema`.
- Types: `PostMetadata` derives from `typeof postMetadataSchema.Type` at `:86`. `PostRecord` and `PostSummary` build on that type at `:88` and `:93`. No `z.infer`, duplicate Zod schema, or Zod parsing wrapper remains.
- Behavior: trims text, validates real ISO calendar dates and URL-safe slugs, normalizes URL whitespace without rewriting the URL, supplies fresh tag arrays and a default `featured` value, rejects non-finite ordering, and reports cross-field `imageAlt` and `series` issues at their field paths.
- Adapter: `apps/web/src/lib/content/collection.ts:24` passes `Schema.toStandardSchemaV1(postDocumentSchema, { parseOptions })` to Content Collections. `postMetadataParseOptions` at `schema.ts:74` rejects excess keys and collects all issues. Do not substitute a bare decoder or omit these options.
- Consumers: `apps/web/content-collections.ts:5`, content registry helpers in `apps/web/src/lib/content/source.ts`, and the public lookup functions/types in `apps/web/src/lib/content/index.ts`. Blog pages and feeds consume those typed records, rather than introducing another validation library.
- Verification: `apps/web/src/lib/content/source.test.ts:114` covers decoding, defaults, normalization, invalid data, strict keys, and issue paths. The registry tests at `:242` exercise real Content Collections compilation and consumers.
- Installed contract: `@content-collections/core/dist/index.d.ts:832` accepts Standard Schema and infers its decoded output. Its `dist/index.js:2008` awaits `~standard.validate` and uses the decoded value at `:2017`. This integration does not require application-owned Zod schemas.
- Registry uniqueness, filesystem containment, and trusted MDX checks in `source.ts` and `validate-mdx.ts` are separate policies, not leftover Zod parsers. Preserve the published-versus-development-draft distinction followed by blog pages, RSS, and sitemap consumers.

Recommendation: retain this schema and Standard Schema boundary. A future schema change must preserve decoded output as well as accepted input. A schema-only rewrite would provide no remaining Zod-removal benefit.

### Eve SQL tool input

- Owner: `apps/web/agent/tools/run_sql.ts:5`, `sqlInputSchema`; `:12`, `runSqlInputSchema`; consumed by `defineTool` at `:18`.
- Behavior: accepts a string `sql` input and strips additional input properties. The schema description documents the intended SQL use; it does not itself prove that a statement is read-only.
- Adapter: both `Schema.toStandardSchemaV1` and `Schema.toStandardJSONSchemaV1` are applied at `:9`. The exported plain object retains the combined `~standard` property. Validation and model-facing JSON Schema are separate requirements; exposing only one is insufficient.
- Installed contract: `eve/dist/src/tools/schema-emission.js:1`, `getStandardSchemaProperties`, accepts objects rather than functions. `eve/dist/src/tools/schema.js:1`, `isToolSchema`, requires validation plus both input and output JSON Schema emitters. The integration emits draft-07 and delegates actual validation to the existing Standard Schema validator.
- Verification: `apps/web/agent/lib/run-sql.test.ts:5` checks the actual Eve serializer, the generated JSON Schema, input validation, and extra-key stripping.

Recommendation: retain the adapter and its integration test. Passing an Effect schema function directly is not equivalent to the plain-object boundary expected by the integration. Changing SQL execution or replacing Eve is outside this Zod migration audit.

### Typography metrics JSON

- Owner: `apps/web/src/app/typography-metrics-schema.ts:3`, `typographyMetricsSchema`; decoder at `:20`.
- Consumer: `apps/web/src/app/typography-inspector-measurements.ts:131` decodes external JSON before caching and using metrics.
- Behavior: validates string fields, finite measurements, positive `unitsPerEm`, and a nonempty source. `category` is optional.
- Verification: `apps/web/src/app/typography-metrics-schema.test.ts` covers valid metrics, invalid units, and non-finite measurements.

Recommendation: keep the existing Effect decoder. No Zod replacement remains.

### Persisted conversation scroll state

- Owner: `apps/web/src/components/ai-elements/conversation-scroll.ts:3`, `scrollPositionSchema`; inferred type at `:8`; decoder at `:9`.
- Behavior: validates a boolean `atBottom` and finite nonnegative `scrollTop`. `readScrollPosition` at `:11` handles malformed JSON/schema input, while `restoreScrollPosition` at `:22` also handles inaccessible session storage.
- Verification: `apps/web/src/components/ai-elements/conversation-scroll.test.ts` covers valid state, absent/malformed state, and storage-access failures.

Recommendation: preserve safe fallback to `undefined`. No Zod replacement or Effect runtime rewrite of scrolling is needed.

### WASM exports and initialization errors

- Owner: `apps/web/src/app/experiments/wasm-canvas/wasm-engine.ts:69`, `CallableExport`; `:71`, `ParticleEngineExports`; `:87`, `decodeParticleEngineExports`.
- Behavior: validates the required callable exports and a real `WebAssembly.Memory`, then maps decode failure to `ParticleEngineAbiError`. The narrow ABI assertion at `:93` remains an interop boundary, not a hidden Zod dependency. Callable checks cannot prove native parameter/return signatures; the actual WASM artifact test is still necessary.
- Consumers: the WASM, WebGPU, and TypeGPU particle renderers plus both Perlin experiments use `loadParticleEngine`. `wasm-engine.ts:44` and `particle-initialization.ts:5` also use Effect tagged errors.
- Verification: `apps/web/src/app/experiments/wasm-canvas/wasm-engine.test.ts` checks the real artifact, malformed exports, distinct failure categories, cancellation, and fresh instance memory.

Recommendation: retain this schema and native-artifact verification. There is no Zod migration to perform, and render loops do not need another abstraction.

## Remaining opportunities and priorities

### P1: Preserve schema integration contracts during future changes

This is a regression-prevention opportunity, not unfinished migration work. Keep one Effect schema owner for each boundary and use its inferred type and appropriate Standard Schema adapter at consumers. The benefit is avoiding a second validation definition or accidental reintroduction of Zod.

Prerequisites: use the installed Effect 4 documentation and source at `apps/web/node_modules/effect`, not remembered Effect 3 APIs or the nonexistent root `node_modules/effect` path. Adapter definitions are in the installed `src/Schema.ts:1386` and `:1407`. Validation may be synchronous or asynchronous; consumers must honor the Standard Schema result contract.

Risk: preserving field names but changing normalization, defaults, excess-key handling, issue paths, or JSON Schema serialization still changes behavior. Suggested checks: run the existing boundary suites listed below and retain the Content Collections and Eve integration assertions when editing these contracts. No source change is required by this audit.

### P2: Evaluate upstream Zod dependency removal only when libraries support it

`bun.lock` retains `zod@4.6.7` at `:1707`. These are library-owned schemas or package contracts, not application-owned schemas that can be rewritten here. There are also shipped Zod copies that a lockfile-only inventory would miss.

| Owner | Evidence | Constraint and recommendation |
| --- | --- | --- |
| `ai@7.0.143` | `bun.lock:893` | Peer requirement Zod 3.x starting at 3.25.76 or Zod 4.x starting at 4.1.8; using Effect in application schemas does not change this package contract |
| `@ai-sdk/gateway@4.0.116` | `bun.lock:133` | Same Zod peer requirement; reached through `ai` |
| `@ai-sdk/provider-utils@5.0.62` | `bun.lock:137` | Same Zod peer requirement; reached through `ai` and gateway |
| `vgpu@0.6.0` | `bun.lock:1681` | Direct `zod: ^4.4.3` requirement and an MCP server dependency; retain unless separately changing the graphics/tooling owner |
| `@modelcontextprotocol/server@2.0.0` | `bun.lock:355` | Direct `zod: ^4.2.0` and MCP core requirements; reached through VGPU |
| `@modelcontextprotocol/core@2.0.0` | `bun.lock:353` | Direct `zod: ^4.2.0` requirement; reached through the MCP server |
| Eve's shipped compiler/runtime | Installed `eve/package.json:636-637` and imports of `#compiled/zod` in its distribution | Eve lists Zod `4.5.4` and `zod-validation-error` `5.0.0` in its development dependencies and ships compiled dependencies; `bun.lock:1049` does not list them as separately installed Eve runtime dependencies. Removing application Zod cannot remove Eve's internal copies |
| Content Collections' shipped configuration machinery | Installed `@content-collections/core/package.json:41`, `dist/index.js:707`, and `dist/index.d.ts:49` | Zod is a development dependency, but the distributed JavaScript and declarations bundle Zod internals. Standard Schema support for application content does not remove this vendor-owned code |

Installed-package paths above are relative to `apps/web/node_modules`. Bundled copies must not be conflated with the separately resolved lockfile version. The Bun store also contains older package directories; the review followed the current workspace symlinks and lockfile rather than counting stale copies. Imports of `zod/v3` can refer to compatibility exports of the locked Zod 4 package, not a second locked Zod 3 resolution.

Runtime use was checked, not inferred solely from peer metadata. Installed `ai/src/util/zod.ts:1` imports Zod factories. Provider Utils' `src/schema.ts:7-8` imports runtime Zod parsing/conversion even though its `FlexibleSchema` at `:82` supports Standard Schema. VGPU's `dist/cli/lib/mcp/server.js:21` and `:41` construct actual Zod tool schemas; MCP server/core distributions import `zod/v4`. These are upstream owners. VGPU's CLI dependency is not evidence that browser shader entrypoints include Zod.

Retain these upstream Zod uses for now; none can safely be replaced by assigning Effect to the dependency's package name. `bun.lock:1049` also records Eve's required AI SDK peer, so simply removing the app's direct `ai` declaration would not safely eliminate this dependency path.

Potential benefit: a smaller installed dependency graph if future compatible upstream releases no longer require Zod. Browser bundle savings are unmeasured and must not be inferred from lockfile presence.

Prerequisites and risk: establish every requiring dependency, check its installed API contract and a candidate release's requirements, then assess regressions in agent schema serialization and graphics/tooling integration. Do not override Zod with Effect, treat them as interchangeable packages, or remove transitive entries while their owners still require them. No compatible Zod-free upstream upgrade is established by this audit.

Suggested verification for a separately approved dependency change: regenerate the lockfile normally, verify a clean frozen-lock install in isolation, inspect the resolved graph and shipped bundles, run schema/integration suites and type checks, and run relevant app and graphics/tooling acceptance checks. Preserve Eve's AI SDK peer and the matching VGPU/WGSL versions. A lockfile search alone is not proof that an integration still works.

## References that are not migration targets

- `apps/web/src/app/how-i-work/content.mdx:43` describes historical use of Zod. It is authored prose, not an import or active validator.
- `skills-lock.json:172` records the installed Zod skill. `.agents/skills/zod/**` contains instructions and examples, not application dependencies. The Tailwind design-system skill's `references/details.md:232` also contains a React Hook Form/Zod example without corresponding application dependencies. Removing these references would not migrate runtime validation. Optional P3 follow-up: decide whether project guidance should point only to the existing Effect v4 convention. Align metadata through its owning skill tooling if changed; do not blindly edit vendored examples or invalidate hashes. The benefit is preventing accidental reintroduction, not install/bundle savings. Retaining them as external integration reference material is reasonable.
- `docs/effect-opportunities.md` is the broader Effect adoption audit. Its final implementation-status section records completed work. Deferred workflow, resource-lifetime, cache, and manual-validation suggestions in that document are not evidence of remaining Zod code and are not duplicated as migration work.

## Optional findings outside the migration scope

The reviewers also distinguished manual validation from Zod usage. These are not required migration tasks:

- Content filename, normalized-tag, local-image path, and trusted-MDX guards already exist. Focused negative fixtures could improve their regression coverage when those policies change; replacing the guards is unnecessary.
- `apps/web/src/components/mdx/animated-diagram.tsx:57` checks owned Giotto JSON. A complete Schema would require the owning Giotto document contract; a shallow replacement offers little benefit. Existing diagram fixture tests already check and render repository diagrams.
- `apps/web/scripts/render-social-preview.tsx:74` and `:105` inspect Chromium/CDP data. Schema decoders could be optional tooling hardening, but protocol-event handling, command-specific result checks, timeouts, and cleanup still matter. Malformed protocol JSON handling is an independent error-handling concern.
- `apps/web/agent/lib/sample-db.ts:25` executes SQL directly. A string schema and a read-only description do not enforce SQL authorization. Any separate safety change needs actual database/parser enforcement and mutation/multi-statement tests, not a validation-library replacement.

These findings are recorded to avoid losing useful review context. They do not change the zero remaining first-party Zod migration count or authorize broader implementation work.

## Suggested order

1. Accept the direct-source migration inventory as complete at this snapshot. There are no straightforward application Zod replacements left to schedule.
2. Preserve the Effect schema owners and existing integration adapters. Run their focused tests whenever schema behavior or consumers change.
3. Revisit dependency-level removal only with a concrete upstream release or an independent reason to change the owning library. That would be a separately scoped compatibility project, not a schema rename.
4. Re-run the inventory after future dependency/schema changes. Keep broader Effect adoption decisions separate from the Zod-removal objective.

## Verification and limitations

The coordinator ran the existing boundary suites from `apps/web`:

```sh
bun test src/lib/content/source.test.ts agent/lib/run-sql.test.ts \
  src/app/typography-metrics-schema.test.ts \
  src/components/ai-elements/conversation-scroll.test.ts \
  src/app/experiments/wasm-canvas/wasm-engine.test.ts
```

Result: **60 passed, 0 failed**, across five files. These checks verify the current implementation, including the repository's existing dirty test changes. They do not prove parity with a historical Zod implementation, because this task made no migration and did not execute an old version.

Repository-wide reference searches were reconciled with source owners, tests, workspace manifests, and the lockfile. Searches covered literal Zod references, `safeParse`, `parseAsync`, `z.object`, `z.infer`, and Effect/schema owners, including hidden first-party configuration while excluding dependencies and generated output. Each remaining reference was classified as upstream-owned, authored prose, tooling guidance, or this report.

The project-local Bun formatter checked this report. `git diff --check` passed. Source-reference paths and line bounds were checked, and a SHA-256 comparison of 373 preexisting first-party files found no changes from the audit baseline. Only this report was added to repository content by the audit; existing dirty source, tests, posts, and skill changes were preserved.

No migration, dependency update, new runtime helper, or GitHub publication is part of this work. No bundle-size, browser GPU, production, or candidate-upgrade claim is made. The remaining uncertainty is whether future upstream releases can remove all separate and bundled Zod requirements without breaking these integrations. That question requires release-specific research and acceptance checks when a concrete candidate is proposed; it does not block the current source audit.
