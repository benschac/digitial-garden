# Effect adoption audit

Audited 2026-10-19 against the current worktree and installed Effect 4.0.5.
The audit below records the original opportunity map. The implementation status
at the end distinguishes completed work from deferred opportunities.

The best opportunities are resource ownership, shared asynchronous work, and
validation at external boundaries. Adopting Effect throughout rendering and pure
calculations would add little value.

## Current adoption and coverage

- `apps/web/package.json` already declares `effect: 4.0.5`. It is installed at
  `apps/web/node_modules/effect`; the root and shared packages do not declare it.
- `apps/web/src/lib/content/schema.ts:1` already uses Effect Schema for metadata,
  defaults, date/URL checks, and cross-field validation.
- `apps/web/src/lib/content/collection.ts:24` already exposes Standard Schema to
  Content Collections, preserving strict unknown-key checks and all issues.
- `apps/web/agent/tools/run_sql.ts:5` already exposes Standard Schema and JSON
  Schema to Eve through its required plain-object adapter.
- Runtime Effect services, scopes, caches, and streams are not yet used in the
  inspected application implementation. Article example strings are not runtime
  adoption.

The audit inventoried 173 TypeScript, TSX, MJS, and Rust source/test files under
`apps`, `packages`, and `scripts`; searched async operations, promises, error
handling, JSON parsing, environment access, timers, and cancellation; and read
the relevant owners. Coverage includes the web app, Eve agent, shared UI/hooks,
content build, tooling, and the Rust/WASM boundary. Generated output, dependencies,
artwork, and prose examples are not migration targets. Findings below are static
source evidence, not browser or production failure reproductions.

## Highest-value opportunities

| Owner                                                                                                                                                                                                                     | Current behavior                                                                                                                                                                                                                   | Useful Effect change                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/experiments/wasm-canvas/webgpu-particle-renderer.ts:423`; `apps/web/src/app/experiments/typegpu-particles/typegpu-particle-renderer.ts:73`                                                              | Devices and buffers are allocated before awaited shader checks at lines 499 and 205. Those rejection paths are outside cleanup covering the whole construction.                                                                    | Register finalizers incrementally with `Effect.acquireRelease` and a renderer-lifetime scope. Use typed unsupported-device, WASM, shader, and pipeline errors. Keep render/resize/step synchronous. This addresses concrete cleanup exposure.                                                     |
| `apps/web/src/app/experiments/wasm-canvas/wasm-canvas.tsx:138`; `apps/web/src/app/experiments/wasm-canvas/particle-header-background.tsx:200`; `apps/web/src/app/experiments/typegpu-particles/typegpu-particles.tsx:138` | Three copies of GPU-to-WASM fallback, cancellation checks, late-result destruction, status updates, and teardown.                                                                                                                  | Extract one initialization workflow with injected renderer factories and tagged fallback handling. React hooks retain activation, state, and teardown ownership. Cancellation must stop the workflow rather than trigger a fallback.                                                              |
| `apps/web/src/components/ai-elements/code-block.tsx:134`                                                                                                                                                                  | Separate maps own highlighter promises, token results, and subscribers. Rejected initialization promises remain cached. Uncached callers can duplicate tokenization. The token key uses only length and first/last 100 characters. | A bounded `Cache` can coalesce work and define failure expiry. Use full-content keys or a collision-safe equivalent; preserve plain-code fallback and unsubscribe component callbacks. Effect alone does not repair keys or subscriptions.                                                        |
| `apps/web/scripts/watch-wasm.ts:9`                                                                                                                                                                                        | Mutable watcher list, child-process handle, debounce timer, queued-build flag, and signal handlers implement a small concurrent program.                                                                                           | A scoped watcher/process service, `Stream` debounce, and one serial worker with one pending rebuild can make shutdown and failure handling explicit. Preserve the initial build and edits arriving during builds. Do not replace the queue with overlapping or cancellation-on-every-edit builds. |

## Other substantial candidates

| Owner                                                                                                                                             | Opportunity                                                                                                                                                                                                                 | Priority and limits                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/experiments/wasm-canvas/wasm-engine.ts:57`                                                                                      | Typed fetch/body/compile/ABI-validation pipeline. Validate required callable exports and memory before accepting the asserted `ParticleEngine`. Cache compiled `WebAssembly.Module` if useful, then instantiate separately. | Medium. Shared by `wasm-particle-renderer.ts:21`, both GPU renderers, and the 2D/3D Perlin experiments (`perlin-noise-experiment.tsx:58`, `perlin-noise-3d-experiment.tsx:92`). Never share mutable WASM instance memory as a cache optimization.                                                                                 |
| `apps/web/src/app/wet-ink-renderer.ts:5`; `apps/web/src/app/use-wet-ink.ts:93`                                                                    | Scope font readiness, GPU initialization, surfaces, shaders, and textures; recover to static text with typed errors.                                                                                                        | Medium. Existing cleanup already handles many cases, so the incremental benefit is smaller than particle rendering. VGPU's `effect()` is unrelated to Effect TS. Keep Motion and drawing native.                                                                                                                                  |
| `apps/web/src/app/typography-inspector-measurements.ts:59`                                                                                        | Decode the unchecked metrics JSON at lines 123–130 with Schema. Distinguish missing fonts, HTTP failures, malformed metrics, and cancellation.                                                                              | Medium; validation is the smallest useful first step. A shared asset-keyed cache and bounded `Effect.forEach` could serve `typography-inspector.tsx:79` and `article-content-overlay.tsx:271`, replacing duplicated per-run promise maps. Preserve font/route dependencies and development asset freshness.                       |
| `apps/web/src/app/api/typography-metrics/route.ts:13`                                                                                             | Wrap realpath and font extraction in typed effects; schema-validate input/output and map failures to HTTP responses at the Next handler.                                                                                    | Medium/low because this is development-only. Preserve the production 404, filename allowlist, realpath containment check, and intentional error responses. Schema validation does not replace filesystem containment. No need for a new HTTP server framework.                                                                    |
| `apps/web/src/components/ai-elements/prompt-input.tsx:78`, `:832`                                                                                 | Use `Effect.callback` for FileReader, signal-aware fetch, bounded attachment conversion, and explicit conversion/send failures.                                                                                             | Medium. Current conversion returns null on failure and submission can retain the original blob URL. Decide failure behavior explicitly and preserve user input when conversion or sending fails. Cancellation needs actual fetch/FileReader adapters.                                                                             |
| `apps/web/src/components/ai-elements/prompt-input.tsx:94`, `:429`                                                                                 | Scope screenshot media tracks/video state, callback waits, timeout, and teardown.                                                                                                                                           | Conditional medium: the screenshot action has no caller outside this module. Existing `finally` already stops tracks; defer until enabled. A browser permission prompt cannot be canceled merely by interrupting an Effect.                                                                                                       |
| `apps/web/src/components/mdx/animated-diagram.tsx:46`                                                                                             | Typed parallel module/fetch loading, Schema validation of the owned diagram envelope, and scoped player/observer cleanup.                                                                                                   | Medium. Preserve Giotto's own format authority, static fallback, reduced motion, reactive dependencies, and optional highlighting. Existing abort and cleanup behavior should survive extraction. Avoid maintaining a speculative duplicate of Giotto's complete schema.                                                          |
| `apps/web/src/components/mdx/article-code-theme.ts:12`                                                                                            | Reuse a highlighting service/cache design with bounded token storage and explicit highlighter lifetime.                                                                                                                     | Medium/low. Unlike chat highlighting, its singleton already resets on initialization failure. Keep article TypeScript/single-theme loading distinct from chat's language/light-dark configuration. Consumers include `effect-walkthrough.tsx` and diagram highlighting.                                                           |
| `apps/web/agent/lib/sample-db.ts:14`; `apps/web/agent/tools/run_sql.ts:19`                                                                        | A `Context.Service`/`Layer` can own sql.js initialization, database release, typed query errors, and test substitution. Adapt back to Promise at Eve's execute callback.                                                    | Medium for architecture, lower urgency while this remains a toy database. The current singleton caches rejection and never explicitly closes the database. Choose initialization retry policy and runtime lifetime deliberately. Effect does not enforce read-only SQL: the current function calls `database.exec(sql)` directly. |
| `apps/web/src/lib/content/collection.ts:27`, `:48`; `apps/web/src/lib/content/source.ts:19`, `:56`; `apps/web/src/lib/content/validate-mdx.ts:68` | Typed filename/MDX/image/compile/registry failures with consistent diagnostics around the build pipeline. Retain Promise adapters for Content Collections.                                                                  | Medium/low. Existing Schema adoption is already valuable. Keep trust validation before compilation and preserve the missing-compiled-file check in `onSuccess`. Deterministically invalid content should fail, not retry. Pure registry checks can remain ordinary functions.                                                     |

## Small or conditional opportunities

| Owner                                                                                                                                                          | Possible use                                                                                                                   | Recommendation                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/ai-elements/conversation.tsx:112`                                                                                                     | Schema-decode saved scroll JSON (`atBottom`, finite/nonnegative `scrollTop`); handle sessionStorage access at lines 70 and 83. | Good small validation boundary if touched. No runtime migration needed for scrolling.                                                                                                                                                                    |
| `apps/web/src/lib/site.ts:3`                                                                                                                                   | `Config` plus URL validation for `SITE_URL`.                                                                                   | Low value for one setting. Worth centralizing if server configuration grows; preserve the current missing-value default deliberately. Do not wrap framework `NODE_ENV` switches.                                                                         |
| `apps/web/src/app/_components/agent-chat.tsx:81`, `:88`; `agent-message.tsx:193`, `:503`; `apps/web/src/components/ai-elements/question.tsx:150`               | Typed command errors if send/cancel/respond operations gain multi-step preparation.                                            | Low today. Eve owns sessions, streaming, resume, and cancellation. Replacing Eve with Effect AI or adding another stream abstraction is an architectural change with no demonstrated need here. Never blanket-retry sends, approvals, or user responses. |
| `scripts/setup-bun-tools.mjs:27`                                                                                                                               | Scoped temporary directory, typed download/checksum/process failures, selective transient-network retry.                       | Low. Existing timeout and `try/finally` already handle the main lifecycle. Preserve checksum/revision verification and avoid adding a package-loading prerequisite to bootstrap tooling without a clear benefit.                                         |
| `scripts/check-changed.mjs:9`                                                                                                                                  | Schema for hook JSON, typed subprocess failures, a shared deadline around checks.                                              | Low. Preserve NUL-safe paths, output protocol, batching, time limits, and existing tests. Root scripts currently have no Effect dependency. `Effect.timeout` cannot preempt a blocking `spawnSync`.                                                      |
| `apps/web/src/app/blog/paper-valley.tsx:111`                                                                                                                   | Typed image-decode batch and stale-completion suppression.                                                                     | Low. The current cancellation boolean is adequate; `decode()` itself is not abortable.                                                                                                                                                                   |
| `apps/web/src/app/editorial-font-preference.tsx:55`; `apps/web/src/app/typography-inspector.tsx:432`; `apps/web/src/components/ai-elements/code-block.tsx:474` | Typed storage or clipboard failures.                                                                                           | Low. Small local fallbacks are proportionate. Keep `editorial-fonts.ts:41` prehydration script independent of runtime loading.                                                                                                                           |

## Keep the current abstractions

- `packages/react-hooks/src/*`: retain the documented abort, frame, event, media,
  and observer contracts. App-owned Effect workflows can receive their signals.
  Introduce an Effect-specific shared hook only after multiple real callers need
  the same lifecycle; neither shared hooks nor UI currently depends on Effect.
- `packages/ui`, styles, stories, page layout, navigation, avatar animation,
  article rhythm/DOM measurements, Motion springs, and ordinary state updates:
  no meaningful runtime adoption benefit identified.
- GPU/WGSL calculations, synchronous WASM stepping, Rust simulation, Perlin,
  vector math, force simulation, and render loops: retain native synchronous
  execution. An Effect lifecycle around a renderer need not wrap every frame.
- `lib/content/index.ts`, blog pages, RSS, sitemap, and session pages: the current
  async adapters mostly perform generated-registry lookup or await Next params.
  Keep framework boundaries; add Effect only behind them when real work merits it.
- Next `dynamic`, Content Collections configuration, Eve agent/auth declarations,
  `scripts/bun-tool.mjs`, and simple config files: no compelling rewrite.
- Typed Eve message rendering, context invariant throws, object-URL state,
  conversation download, walkthrough playback, and synchronous SVG token drawing:
  retain current owners. Do not validate already-typed internal values repeatedly.

## Adoption rules and suggested order

1. Start with particle renderer acquisition and the shared fallback workflow.
   Test shader rejection, partial allocation, abort during initialization, late
   acquisition, fallback failure, and exactly-once disposal.
2. Consolidate chat highlighting. Test concurrent callers, initialization
   failure then recovery, distinct code with identical old cache keys, cache
   bounds, and unmounting subscribers. Consider article highlighting afterward.
3. Add Schema at typography JSON, persisted scroll, and WASM ABI boundaries.
   Verify malformed values and preserve existing content/WASM parity checks.
4. Refactor the WASM watcher if its lifecycle is becoming painful. Test burst
   edits, edits during a build, spawn failure, nonzero exit, and shutdown.
5. Adopt the remaining workflows as their features grow. The database is also a
   compact server-only pilot if minimizing browser integration is the priority.

Use Effect at coarse workflow boundaries, with `Effect.runPromise` or a
deliberately owned `ManagedRuntime` at Promise/framework edges. Services and
Layers are useful for dependencies and resources; a provider graph for every
small helper is unnecessary. Keep Bun tests; no testing-framework migration is
required to test Effect programs.

A scope must remain open for as long as its resource is used. Closing a scope
immediately after returning a renderer would destroy it before rendering.
Register cleanup after each acquisition, not only around the final constructor.
Nonabortable operations such as device acquisition, shader compilation, fonts,
WASM instantiation, image decoding, and display capture still require protected
acquisition/finalizer registration or late-result disposal. Wrapping an existing
constructor in interruptible `tryPromise` alone does not fix resource leaks.

Effect caches can cache failures too. Explicitly choose failure TTL or
invalidation; otherwise the existing rejected-promise behavior may be recreated.
Retry only identified transient, repeatable operations, not invalid schemas,
shader defects, user-denied permissions, arbitrary SQL, or agent commands. This
matches the official [v4 retry guidance](https://effect.website/docs/v4/error-management/retrying).

API names and behavior were checked against the installed
`apps/web/node_modules/effect/AGENTS.md`, its resource/runtime/process examples,
and `src/Effect.ts`, `src/Cache.ts`, `src/Schema.ts`, `src/Stream.ts`, and
`src/Context.ts`. Any later code work should read that installed guide first.
The invoked local skill's suggested root `node_modules/effect` path does not
match this workspace's installation. No upgrade or root dependency is necessary
for this audit; platform process adapters would require a separate dependency
decision, while existing Bun APIs can be wrapped directly.

## Implementation status (2026-10-19)

The first three adoption steps are implemented in this worktree:

- Both GPU constructors acquire devices, TypeGPU roots and buffers into an
  explicit Effect scope. Partial texture creation retains immediate ownership.
  Failure and cancellation close the scope; successful renderers retain it until
  idempotent teardown. Render, resize and simulation loops remain synchronous.
- The three particle consumers share the injected GPU/WASM initialization
  workflow. Abort errors and aborted signals stop fallback; late results are
  destroyed. The existing React hooks still own activation and state.
- Chat highlighting uses Effect caches with full-content keys, shared in-flight
  work, bounded token storage and immediate failure expiry. Unmounting clears
  subscriber callbacks. Highlighters retain their application lifetime, while
  article highlighting remains separate.
- Typography metrics and saved scroll positions are decoded with Schema;
  storage access failures fall back safely. WASM exports are validated before
  the native ABI assertion, with a fresh mutable instance for each caller.

At this snapshot, the watcher refactor remained deferred: its serial worker
already preserved the initial build and one pending rebuild. The follow-up below
records its implementation alongside database ownership and attachment conversion.
Other medium/low and conditional candidates remain opportunities, not migration
requirements; screenshot capture is still unused.
No dependencies, shared-hook contracts, agent instructions or pure calculations
are changed.

Automated checks cover resource lifetime, partial acquisition, cancellation,
late results, fallback failure, highlighting coalescing/recovery/eviction,
malformed boundary data and the real WASM artifact. Browser GPU rendering and
physical-device behavior require separate acceptance. One existing limitation
remains: after a canvas has acquired a WebGPU context, it cannot switch to a 2D
context on that same element; failures after that point can report unavailable
instead of completing the WASM fallback.

## Workflow implementation follow-up (2026-10-29)

Three isolated workers implemented the remaining workflows selected for this
follow-up. The coordinator integrated only their owned files, preserving existing
source and content changes. No dependencies, SQL authorization policy, screenshot
capture, shared-hook contracts, or render loops changed.

### WASM watcher

`apps/web/scripts/watch-wasm-lifecycle.ts` owns signal handlers, filesystem
watchers, debounce queues and processes through Effect scopes. The CLI in
`watch-wasm.ts` retains native filesystem and Bun adapters. The initial build,
120ms debounce, serial execution and one pending rebuild remain. Partial watcher
acquisition unwinds; spawn and exit failures are reported without poisoning later
builds. Shutdown stops accepting changes, discards pending work, terminates the
direct child and waits for its exit. It does not add process-group termination or
a forced-kill deadline.

`watch-wasm.test.ts` covers burst edits, changes during builds, partial acquisition,
spawn/wait failures, nonzero exits, signal removal and shutdown. The worker also
ran a native CLI smoke test with a controlled build process. Real Cargo compilation
was not part of that check.

### Sample database

`apps/web/agent/lib/sample-db-service.ts` provides a scoped Effect service for
sql.js. Successful initialization is shared for the owner's lifetime; failures
expire immediately so a later request can try again. Failed seeding closes its
database, and SQL queries are never retried. `sample-db.ts` preserves the existing
Promise boundary using one lazy module-lifetime ManagedRuntime. `createSampleDb`
creates independently disposable owners; `disposeSampleDb` closes the default
owner permanently. Hosts must invoke disposal when ending the database lifetime;
no global shutdown handlers were installed.

`sample-db.test.ts` exercises real sql.js queries and persistent mutations,
concurrent initialization, failure recovery, layer substitution and disposal before,
during and after initialization. The historical `runReadOnlySql` name is not an
authorization guarantee; its existing SQL execution semantics are unchanged.

### Attachment conversion and submission

`apps/web/src/components/ai-elements/prompt-input-attachments.ts` provides typed
Effect adapters for fetch and FileReader, with ordered conversion concurrency
limited to three. `PromptInput` uses the existing abort-controller hook. Failed
conversion never submits an unresolved blob URL; conversion/send failures preserve
input and use the existing optional `onError` callback with `attachment_conversion`
or `submit` codes. Unchanged duplicate submissions are suppressed, while a changed
draft can submit a steering message before the previous streamed response ends.
Canceled or stale completions cannot clear newer text or files.

The regression suite covers aborted reads/fetches, cleanup, HTTP/read failures,
ordered bounded conversion, sibling cancellation, retry after failure, duplicate
submission and stale completion. Once the consumer's `onSubmit` has begun, its
unchanged callback contract does not allow cancellation of that external send.
A disposable headless Chrome harness mounted the actual component in local and
provider modes under development Strict Mode. All 22 checks passed, covering
native FileReader/blob conversion, failure preservation, retries, duplicate
suppression, changed-draft steering, stale completion and unmount cancellation.
The harness recorded source hashes and no uncaught errors. This does not verify
the complete AgentChat/backend streaming stack or visual styling.

### Integrated verification

- The three new suites plus the five existing schema boundary suites passed:
  113 tests, zero failures.
- `bun run test` passed: 172 tests across 21 files, zero failures. This task does
  not replace the explicit watcher and agent test invocation above.
- `bun run check-types` passed for all three workspace packages, with the shared
  packages served from cache and the web package checked after content generation.
- Native headless Chrome acceptance passed 22 mounted-component checks in both
  local and provider modes. The disposable runner and source-hashed report are at
  `/tmp/prompt-input-browser-HxnRIy/run.ts` and `report.json`; rerun with
  `bun /tmp/prompt-input-browser-HxnRIy/run.ts` while those temporary artifacts exist.
- Owned-file lint and formatting checks passed, as did `git diff --check`.
- The repository-wide formatting baseline already reported 115 files. This
  follow-up formats only its owned files rather than rewriting unrelated code.

The other audit candidates remain conditional opportunities, not completed work
or requirements to introduce Effect everywhere. Third-party Zod internals remain
outside this workflow conversion.
