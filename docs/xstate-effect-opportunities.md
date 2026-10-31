# XState and Effect opportunity audit

Audited 2026-10-31 at commit `5cb5f133156a54e15cba3fc55ea4ad34b2fb651d`. This is an opportunity map, not a migration mandate. The initial audit changed no application code or dependencies; the subsequently authorized A1–A5 implementation is recorded at the end. “XCode Effect” is interpreted as `@xstate/effect`, the bridge included in the latest source-reference commit.

The best new XState candidate is the particle renderer lifecycle. The best new Effect candidates are the social-preview resource pipeline and shared typography requests. Before migrating chat orchestration, fix its demonstrated submission-outcome mismatch. Much of the earlier Effect audit is already implemented.

## Scope and evidence

Three read-only explorers covered rendering/experiments, chat/agent code, and UI/shared packages. The coordinator covered content, server routes, scripts, configuration and integration. We inventoried 244 tracked TS/TSX/JS/MJS/MTS/Rust files under `apps`, `packages`, `scripts`, and `tools`: 208 application/shared/tooling files and 36 vendored lint implementation files. Tests and configuration are included in that count. Runtime owners and relevant tests received focused source inspection; this does not claim every line of every file was independently reviewed.

| Area | Inspected ownership and disposition |
| --- | --- |
| Experiments | WASM canvas, TypeGPU particles, header particles, Perlin 2D/3D, forces, vector playground, initialization, renderer ownership, ABI and related tests. Resource lifecycle opportunities; keep simulation and frame math native. |
| GPU lettering | Wet-ink hook/renderer, ink grain and fallback behavior. Effect ownership opportunity; keep Motion and rasterization. |
| Chat and agent | All `agent/**`, `agent-chat`, `agent-message`, `/s` routes and `components/ai-elements/**`. Preserve Eve as the session/stream/answer authority. |
| Article figures | Giotto/Pele wrappers, article highlighting, walkthrough playback and tests. Resource ownership and optional finite playback states. |
| Typography and home/blog UI | Font resolver, inspector, content/rhythm overlays, preferences, panel, audio, home animation/navigation, blog imagery, transitions and static routes. Shared font-request opportunity; most rendering stays as-is. |
| Shared packages | All five hook source files; UI component/export/story/style scan; Rust engine exports and simulation structure. No general Effect/XState migration. |
| Content and server | Metadata/MDX schemas, collection/compiler pipeline, registry, typography metrics endpoint, RSS, sitemap and site URL. Existing validation retained; typed I/O pipeline is optional. |
| Tooling | WASM watcher, dev launcher/port selection, social rendering, typography artifact generation, source mirrors, changed-file checks, formatter runner and tests. Social-rendering resource ownership is useful; the watcher already uses Effect. |
| Reference/non-runtime material | Vendored lint provenance/configuration, root build/CI configuration, docs, authored MDX/diagram data, shaders, styles and assets were classified rather than treated as runtime migration targets. Generated output, downloaded mirrors, dependencies, archived plans, agent skills and Blender/export artifacts are not application adoption targets. |

The historical [Effect audit](effect-opportunities.md) remains a record of earlier work. Its opening “not yet used” statements describe October 19 before implementation; its implementation follow-ups and current source take precedence.

## Version and guidance boundary

`bun run sources:check` passed before using the mirrors. Existing mirrors were sufficient; no fetch, install, upgrade or source refresh was needed.

| Library | Verified status | Source identity |
| --- | --- | --- |
| Effect | Installed and lockfile-resolved `4.0.5` in `apps/web` | `7f524e25cfb49a71ac39b0f44278d08d40dda5de` |
| XState | Reference only, `6.0.0-alpha.71`; absent from application dependencies/lockfile | `8cf3f00b41984a32ce935db117f52b628cfcd5ac` |
| XState Effect | Reference only, `1.0.0-alpha.10` | Same XState commit |

The bridge declares Effect `^4.0.0` and XState `^6.0.0-alpha.71` peers. This establishes declared compatibility, not a tested integration in this application. Both XState references are prereleases. This audit does not select a production dependency upgrade or claim they are today's newest releases.

Applied [rat-stack-mode](https://ratstack.sh/skills/rat-stack-mode), [add-a-lifecycle-machine](https://ratstack.sh/skills/add-a-lifecycle-machine), and [durability](https://ratstack.sh/skills/durability), adapting them to this repository:

- [Lifecycles are machines](https://ratstack.sh/lore/lifecycles-are-machines) changes the recommendation from wrapping every asynchronous function to modeling renderer availability and valid user events. Direct Effects remain sufficient for linear work.
- [Scopes own resources](https://ratstack.sh/lore/scopes-own-resources) makes successful initialization lifetime, partial acquisition, replacement and late completion acceptance criteria.
- [Run Effect at the boundary](https://ratstack.sh/lore/run-effect-at-the-boundary) keeps React, Next, Content Collections, Bun and Eve integration intact.
- Durability guidance prevents promising that an in-memory actor survives reloads or that interruption undoes a server-accepted send. No new persistence is justified by this audit.

Rat-stack's live agent rules use Effect `4.0.7`, Foldkit, pnpm and additional test/lint packages. Those choices were not imported. The installed Effect guide and exact source own API correctness here. The local `effect-ts` skill is a setup guide whose `effect@latest` installation advice is unnecessary for this existing installation. The web tool could not retrieve `llms.txt`; the rat-stack connector supplied the routing skills and relevant lore, and the vision/agent-rule pages were accessible.

## Existing adoption to retain

| Owner | Already implemented |
| --- | --- |
| `app/experiments/wasm-canvas/renderer-lifecycle.ts` and both GPU constructors | Effect scopes, immediate allocation ownership, failure cleanup and idempotent destruction. |
| `app/experiments/wasm-canvas/particle-initialization.ts` | Shared GPU-to-WASM fallback, abort classification and late-result disposal. |
| `app/experiments/wasm-canvas/wasm-engine.ts` | Typed fetch/body/instantiation/ABI failures, Schema checks and independent mutable instances. |
| `components/ai-elements/prompt-input-attachments.ts` | Abortable fetch/FileReader adapters, ordered conversion concurrency of three, sibling interruption, revision checks and typed failure callbacks. |
| `components/ai-elements/code-block-highlighting.ts` | Coalesced highlighter/token work, full-source keys, bounded token entries and failure expiry. |
| `agent/lib/sample-db-service.ts`, `sample-db.ts` | Effect service/Layer, lazy shared initialization, retry after failed initialization, scoped database close and Promise integration. |
| `scripts/watch-wasm-lifecycle.ts` | Scoped watchers/signals/processes, debounce, serial builds and one pending rebuild. |
| Content schemas, typography metrics, conversation scroll | Effect Schema validation at external/persisted boundaries. |

Paths in this section are relative to `apps/web/src`, except `agent/**` and `scripts/**`, which are relative to `apps/web`.

## First priorities

### A1. Repair the chat submission outcome boundary — high, demonstrated

Owners: [`agent-chat.tsx`](../apps/web/src/app/_components/agent-chat.tsx) at lines 88–114; [`prompt-input-attachments.ts`](../apps/web/src/components/ai-elements/prompt-input-attachments.ts) at 192–224; [`prompt-input.tsx`](../apps/web/src/components/ai-elements/prompt-input.tsx) at 856.

The composer considers a resolved `send` Promise successful and clears the current draft. Installed Eve `0.80.1` catches transport failures into its snapshot error/status and normally resolves that Promise. A local probe using the actual Eve store and actual submission coordinator, with an injected failing transport, returned:

```json
{
  "status": "error",
  "error": "controlled transport failure",
  "cleared": true,
  "reported": false
}
```

This demonstrates the adapter mismatch without network/model requests. It is not full browser/backend acceptance. Installed owners are `eve/dist/src/client/eve-agent-store.js` and `eve/dist/src/react/use-eve-agent.js`.

Smallest correction: an app-owned submission outcome contract based on Eve's authoritative operation state/events, distinguishing acceptance, failure and cancellation. Do not read a stale React snapshot after awaiting, treat every later turn error as a rejected submission, or retry an ambiguous send automatically. Effect can express the typed boundary; XState cannot repair an incorrect success signal by itself.

Acceptance: actual Eve store with failing transport, successful acceptance, cancellation, changed draft, steering while busy, retained attachments, and operation identity across overlapping results. Existing tests model a rejecting send and therefore miss this resolved-error contract.

### A2. Share the particle lifecycle — high, strongest XState candidate

Owners: [`wasm-canvas.tsx`](../apps/web/src/app/experiments/wasm-canvas/wasm-canvas.tsx) at 27, 153, 191 and 238; [`typegpu-particles.tsx`](../apps/web/src/app/experiments/typegpu-particles/typegpu-particles.tsx) at 27 and 153; [`particle-header-background.tsx`](../apps/web/src/app/experiments/wasm-canvas/particle-header-background.tsx) at 135, 214 and 249.

Model availability as initializing GPU, initializing fallback, ready, lost/failed and disposed. Keep user pause, visibility and reduced-motion eligibility distinct. XState owns permitted transitions; existing Effect operations retain acquisition/fallback/cleanup. The bridge is useful if it actually replaces the ad hoc asynchronous transition coordination.

Source demonstrates a control-flow gap: device loss cancels animation but leaves renderer references set. Page Resume and header visibility/intersection handlers can schedule the lost renderer again. This was not reproduced with a browser GPU. A guard or reducer could fix the defect independently of XState. Automatic recovery after loss would be new behavior, requiring a deliberate design.

Also include initial resize/count configuration in the initialization success boundary: those calls currently follow the factory catch, so a throwing setup continuation can bypass its error presentation/cleanup. GPU-to-2D fallback cannot reuse a canvas that already owns a WebGPU context; a machine does not remove that browser constraint.

Acceptance: cancellation never starts fallback; late acquisition is destroyed once; initialization success keeps the renderer alive; loss blocks resume/visibility/resize/control calls; late ready does not overwrite loss; user pause survives visibility changes; reduced motion does not restart animation; setup exceptions release resources. Browser GPU/device-loss acceptance remains necessary.

### A3. Scope social-preview generation — medium, strong Effect fit

Owner: [`render-social-preview.tsx`](../apps/web/scripts/render-social-preview.tsx) at 11, 16, 49, 88, 125 and 213.

One linear program owns a temporary directory, Chromium, a WebSocket, command waiters/timers, frame files and FFmpeg. A scoped Effect pipeline with native process adapters would make cleanup and typed stage failures explicit. XState is unnecessary unless the exporter gains interactive cancellation, resumability or an observable job UI.

Source-visible gaps: the temporary directory is created before the protected block, so a font read failure bypasses cleanup; browser spawn has no error listener; shutdown checks `exitCode` but not `signalCode`, so a previously signal-exited process can leave it waiting for an event that already occurred. Socket close does not promptly settle pending commands. These paths were inspected, not reproduced against Chromium/FFmpeg.

Register each resource immediately, settle command waiters on disconnect, observe process errors/exits and own encoders through shutdown. Preserve ordered frame capture and the existing output contract. An ordinary cleanup fix is valid without a full Effect rewrite. Do not select new timeout values without measurement, and do not claim Effect can preempt synchronous work.

Acceptance: missing font/browser/encoder, early browser exit, socket disconnect, malformed response, frame-write failure, encoder failure, interruption and exactly-once cleanup. Do not run the real exporter merely to audit it: it writes generated public assets.

### A4. Coalesce typography requests — medium, Effect

Owners: [`typography-inspector-measurements.ts`](../apps/web/src/app/typography-inspector-measurements.ts) at 27, 63, 120 and 134; [`typography-inspector.tsx`](../apps/web/src/app/typography-inspector.tsx) at 126; [`article-content-overlay.tsx`](../apps/web/src/app/article-content-overlay.tsx) at 281.

The shared cache stores completed metrics; each caller maintains a separate in-flight map. Simultaneous inspector/overlay requests can duplicate the same asset fetch. Move request/decode work into one app-owned service/cache keyed by resolved asset. Keep DOM selection and measurement synchronous and retain existing Schema decoding.

This is a design improvement, not demonstrated user-visible breakage. Choose capacity from asset cardinality and preserve development freshness. One canceled subscriber must not invalidate another subscriber's work. Failed loads should remain retryable; exact metrics and `verified:false` fallback must remain distinct. Test these properties plus rapid route/font changes before considering an additional inspection state machine.

### A5. Tighten wet-ink allocation ownership — medium, Effect

Owners: [`wet-ink-renderer.ts`](../apps/web/src/app/wet-ink-renderer.ts) at 10, 93 and 123; [`use-wet-ink.ts`](../apps/web/src/app/use-wet-ink.ts) at 93.

Current code already handles several abort/late-result paths. The improvement is incremental ownership around fonts, GPU/surface/shader and texture replacement. A new texture is created before copy/bind operations but assigned to the cleanup variable afterward; a throwing resize path can leave that new allocation outside local ownership. Native persistence after device disposal was not measured.

Reuse or compatibly extract the ownership portion of `createRendererScope`; register a replacement immediately and retire the old texture only once the new one is usable. Test failure at each allocation/binding stage and cancellation after acquisition. Keep springs, pointer updates, rasterization and drawing native. VGPU's `effect()` is unrelated to Effect TS.

## Further opportunities

These are alternatives or incremental extensions, not a cumulative requirement to install all three libraries everywhere.

| ID / priority | Owner | Fit and proposed boundary | Required proof or reason to defer |
| --- | --- | --- | --- |
| B1 / medium | `components/ai-elements/prompt-input-attachments.ts:173` | XState Effect for idle/converting/sending/failed/succeeded with submit/edit/cancel events, invoking existing conversion Effects. | Fix A1 first. Preserve changed-draft steering, duplicate suppression, revision identity and bounded conversion. Existing tests make this a maintainability choice. |
| B2 / medium | `components/mdx/animated-diagram.tsx:37–136` | Effect initialization/ownership for fetch, imports, player and observers; optional typed document boundary using Giotto's actual format. | Current cleanup exists; no proven leak. Test restart, unmount during imports/highlighting, partial player attachment, malformed data and exactly-once disposal. Keep caption and optional highlighting fallback. |
| B3 / medium-low | `components/mdx/article-code-theme.ts:12–46` | Bounded Effect token cache and explicit highlighter lifetime. | Initialization already coalesces and resets rejection; source inputs are finite/authored. Establish growth before prioritizing. Keep article language/theme separate from chat. |
| B4 / medium-low | `lib/content/collection.ts:27,48`, `source.ts:19`, `validate-mdx.ts:106` | Typed Effect pipeline for validation, filesystem checks and compilation; run at Content Collections Promise callbacks. | Keep validation before compilation, filename diagnostics and missing-compiled-file checks. Never retry invalid authored content. Pure registry/metadata calculations stay plain. |
| B5 / low | `app/api/typography-metrics/route.ts:13` | Typed filesystem/font extraction failures, mapped to existing Next responses. | Development-only; preserve production 404, name allowlist and realpath containment. Existing endpoint tests already verify traversal/symlink restrictions. No new HTTP server needed. |
| B6 / low | `scripts/prepare-typography-metrics.mjs:6` | Effect batch with typed per-font failures and bounded concurrency if font volume warrants it. | Current fixed asset set uses `Promise.all`; no demonstrated overload. Measure before choosing concurrency. Keep Next's build hook and fail build on broken required assets. |
| B7 / conditional | `app/experiments/wasm-canvas/wasm-engine.ts:97` | Effect cache for immutable WASM bytes/compiled module. | Measure repeated compilation first. Instantiate fresh mutable memory per caller; preserve failure expiry and independent consumer cancellation. |
| B8 / conditional | `components/ai-elements/prompt-input.tsx:82,417` | Effect-owned screenshot media/video/encoding lifecycle; optionally choosing/capturing/encoding/attached states. | Exported screenshot action has no current app caller. Browser permission cannot be canceled by interrupting a fiber; late streams still need track disposal. |
| B9 / conditional | `scripts/watch-wasm-lifecycle.ts:98–117` | Extend existing Effect process ownership; XState only if observable build/recovery modes are added. | Already tested serial queue and shutdown. Direct child kill followed by unbounded exit wait is an explicit limit; descendant termination/escalation requires native adapter proof and a chosen policy, not another queue. |
| B10 / conditional | `agent/lib/sample-db.ts:13–34` | Connect existing runtime disposal to an explicit host lifecycle if one is introduced. | Disposal is exposed and tested, but production callers do not invoke it. Decide whether process lifetime is intentional; do not close after each query or add global handlers speculatively. |
| B11 / conditional | `components/ai-elements/code-block-highlighting.ts:11–31` | Scoped highlighter disposal if route ownership or measured memory use warrants it. | Token cache already bounded; language highlighters retained. Do not destroy shared highlighters when one subscriber leaves. No machine needed. |
| C1 / low, XState learning slice | `components/mdx/effect-walkthrough.tsx:73–130,238–262` | XState-only paused/playing/completed with play/pause/select/replay/visibility events. | Pure illustration, no Effect bridge needed. Test end, replay, late ticks, kind change and reduced motion. A reducer remains adequate. |
| C2 / low | `app/editorial-font-switcher.tsx:42–126,177–197,279` | XState-only closed/open/minimized with explicit focus/reset events. | Preserve mounted previews while minimized, route-key reset and focus return. Sliders/settings remain values, not individual machine states. |
| C3 / low | `components/ai-elements/reasoning.tsx:82–122` | XState-only first-stream/autoclose/manual-toggle lifecycle. | Test historical messages, later streaming and controlled disclosure. Current reducer/React logic may be simpler. |
| C4 / low | `app/_components/agent-message.tsx:214,249,541`, `components/ai-elements/question.tsx:150` | Local response command error adapter; machine only for new confirmation/edit/retry phases. | Eve already owns optimistic answers and duplicate refusal. Do not create a competing answered state; test rejected preflight commands and inline errors. |
| C5 / low | `app/_components/agent-chat.tsx:81` | Local cancellation command requesting/acknowledged/failed feedback if needed. | Eve owns actual durable cancellation. Test session changes and stale acknowledgements; local interruption is not cancellation of accepted work. |
| C6 / conditional | Typography inspector, animated/Mermaid diagram wrappers | XState Effect only if explicit retry/progress/reload UI makes resolving/partial/ready/failed states meaningful. | Prefer A4/B2 first. Keep partial font results and Giotto/Pele internal playback/rendering authoritative. |
| C7 / low | Forces/Perlin playback; `app/interaction-sounds.tsx:22–62`; `app/blog/paper-valley.tsx:35–125` | XState only when recording/replay, retry or richer asset/audio modes are added. | Current state is compact. Keep audio `unlock()` synchronous in the user gesture; Cuelume already converts failure to `false`. Image decode is nonabortable and already suppresses late results. |
| C8 / low | `scripts/agent-sources.mjs`, `scripts/check-changed.mjs`, dev launcher/port finder, `lib/site.ts` | Effect CLI/config/schema/error adapters if these grow into larger workflows. | Root tooling has no Effect dependency. Existing subprocess, receipt, NUL-safe path and deadline behavior is tested. `Effect.timeout` does not preempt `spawnSync`; wrapping simple tools now adds cost. Site URL already has precedence tests. |

Paths in this table start under `apps/web/src` unless prefixed by `agent/` or `scripts/`; `agent-sources.mjs` and `check-changed.mjs` are root scripts. Exact file links for cross-cutting owners are in the priority sections and coverage map.

## Separate policy mismatch: SQL

[`run_sql.ts`](../apps/web/agent/tools/run_sql.ts) at 7–21 describes read-only SELECT, but [`sample-db-service.ts`](../apps/web/agent/lib/sample-db-service.ts) at 91 executes arbitrary SQL. Existing tests deliberately confirm persistent mutations. This is a contract decision, not an Effect/XState conversion gap; it does not establish production data exposure.

If enforcing the advertised contract, use a verified database authorization/query boundary and bounded execution. A regex is insufficient. The 500-row output slice occurs after materialization, and an Effect timeout cannot interrupt synchronous sql.js execution. Keep authorization and resource orchestration as separate concerns.

## Keep current abstractions

Keep React state and the shared browser lifecycle hooks for normal UI interactions, Motion/native animation for frames and springs, and Base UI/cmdk owners for shared controls. Do not add actors for pointer coordinates, pressed flags, each eye, sliders, DOM measurements, geometry, CSS, WGSL or Rust simulation.

Keep Eve for session creation, streaming, resume, steering, answer settlement and durable cancellation. Keep Next/Content Collections adapters, static pages, RSS/sitemap generation, generated-registry reads and prehydration preference scripts. No Effect AI, cluster/workflow persistence, universal runtime, new backend or shared-package dependency is justified by the current task.

Vendored lint rules remain reference-owned AST visitors; converting them into Effect programs would not improve their contract. New machine-specific lint rules should be considered only with an actual integration and a fixture proving the prohibited behavior is rejected.

## Bridge implementation constraints

Read [source-reference guidance](agent-sources.md) before implementation. Verified against `.agent_sources/xstate-effect/packages/xstate-effect/src/index.ts`, `createEffectActor.ts`, `actorScope.ts`, `effectLogic.ts`, `runtime.test.ts` and `docs/atoms-and-react.md`:

1. Use `createEffectLogic`, `setupEffect` and `createEffectActor`. The selected pin does not export the older quick-start's `fromEffect` API.
2. Start Effect-backed logic in an Effect scope. Plain XState `createActor` and React `useMachine/useActor/useActorRef` do not supply the required Effect host. Read the pinned integration before choosing a React subscription adapter; atom bindings or `@xstate/react` would be additional dependency decisions.
3. Invoked task resources close on completion, failure or cancellation (`runtime.test.ts:232`). A renderer/player returned from a short task must not already have been destroyed. Retain the existing explicit owner or use a deliberately longer scope. `withActorScope` retains until actor stop (`runtime.test.ts:145`); it also requires a replacement policy so old renderers do not accumulate until unmount.
4. Await results with the actor's observation APIs; sending an event does not synchronously establish its resulting state. Keep gesture-authorized browser operations at their required synchronous boundary.
5. Cancellation does not undo an accepted external operation. Expected errors, defects and cancellation must remain distinguishable. Retry only operations whose repeated effects are safe.
6. Preserve Bun tests. For a machine, test event histories and invariants against controlled dependencies; use the pinned clock/testing APIs for time. A passing typecheck is not proof of cleanup or UI behavior. Upstream tests were inspected, not executed as part of application verification.

## Suggested delivery order

1. Repair A1 with a regression test using the actual Eve store and local fake transport.
2. Address A2's lost-renderer/setup failure paths. Use it as the first XState/bridge pilot only if the model replaces existing coordination and the dependency choice is approved.
3. Apply A3 and A5 resource fixes, with scopes where they simplify ownership.
4. Extract A4's shared typography request service; then consider B2/B3 article resources.
5. Reassess B1 after the chat outcome contract is correct. Use C1 as a small XState-only learning exercise if that is an explicit goal.

Independent implementation ownership could be split into chat boundary, particle lifecycle, exporter resources, and typography/diagram work. Agree shared renderer/resource interfaces first; keep one owner for `prompt-input-attachments.ts` and shared highlighting APIs. The coordinator should integrate and review each tested slice. No migrations or dependencies were installed by this audit.

## Verification record

- `bun run sources:check`: passed for both pinned mirrors and the installed Effect version.
- `bun run verify`: failed at the existing lint/format stage before any tracked edits. Formatting reported 190 files; lint also reported existing errors. Checks were not disabled and unrelated files were not reformatted.
- `bun run check-types`: passed all three workspaces; two shared-package results were cached, web/content validation ran.
- `bun run test`: 208 passed, zero failed, 901 assertions across 25 files; content generation validated 17 documents.
- `bun run test:tools`: 45 passed, zero failed after allowing local port-binding tests outside the restricted sandbox. Initial restricted run failed with `listen EPERM`.
- Focused renderer tests: 33 passed; focused chat tests: 54 passed. These overlap the full application test run and are not additional unique test counts.
- Local Eve failure probe: demonstrated resolved-error submission mismatch without network requests.
- `bun run build`: passed outside the sandbox in 18.2 seconds. The restricted build was stopped after remaining in compilation without progress; it did not establish a source failure.
- Document formatting, relative-link resolution (16 local links), and whitespace checks passed. Only this report was added.
- Independent review retraced A1–A5, reproduced A1 and checked bridge scope behavior. No substantive correctness/safety findings; five shorthand owner paths were corrected.

The initial audit did not perform browser GPU/device-loss, mounted UI, real exporter, live agent backend, production or physical-device acceptance. Its proposals were unimplemented at that point.

## Implementation follow-up (2026-10-31)

The user authorized independent implementation of the five first priorities and asked for deliberate model/reasoning selection. Five bounded workers ran in two waves, with three workers active at most. The coordinator owned dependency changes, documentation, integration and browser acceptance. All workers had separate files and short task packets rather than full conversation copies. No optional B/C migration or SQL-policy change was included.

| Work | Model / reasoning | Implemented result |
| --- | --- | --- |
| A1 chat | GPT-6.1 Sol / high | A public Eve client/store adapter observes transport acceptance and returns accepted/cancelled/unconfirmed outcomes. The composer retains uncertain or canceled drafts, supports legacy callbacks and separates accepted streaming from later composer cancellation. |
| A2 particles | GPT-6 Astra / high | A shared XState Effect controller owns availability and initialization across the two particle pages and header; synchronous fencing blocks lost-device calls immediately. Initial configuration participates in cleanup. |
| A3 exporter | GPT-6.1 Sol / medium | One Effect scope owns the temporary directory, observed browser/encoder processes and socket. Native adapters settle disconnected waiters and recognize already-exited processes. Frame order and output design are preserved. |
| A4 typography | GPT-6.1 Sol / medium | Effect Cache shares only pending exact-asset requests. Final-subscriber cancellation interrupts the request; successful and failed completion expire immediately, avoiding stale development results or an arbitrary retained-cache bound. |
| A5 wet ink | GPT-6.1 Sol / high | Existing renderer scopes own GPU/surface/shader. A texture slot owns each candidate immediately, releases replaced textures promptly and restores the old binding on preparation failure where possible. |

The deeper reasoning assignments cover accepted-send semantics and resource races; the bounded exporter and request-sharing work use medium reasoning. Three independent GPT-6.1 Sol reviewers, each at high reasoning, checked correctness, security and unnecessary complexity against the same frozen patch. They found no actionable defects. This is a task allocation decision, not a measured claim about token savings.

Only `xstate@6.0.0-alpha.71` and `@xstate/effect@1.0.0-alpha.10` were added to the web runtime dependencies. The lockfile retains unrelated versions. Source-mirror validation now checks these installed packages as well as Effect. No React bindings, platform packages, testing frameworks or shared-package dependencies were added.

New reusable owners and lifecycle contracts are linked in [the standard-library directory](standard-libraries.md). The Eve adapter depends on verified `0.80.1` behavior: its fresh ordinary headers object survives dispatch to the public client method, providing local request identity without adding a tracking header. Actual-store tests cover that invariant, transport failure, acceptance before a later stream failure, steering and cancellation. Keep those tests when updating Eve. No private package imports or assertions were required for that boundary.

Integrated verification:

- All 287 application tests and 45 tooling tests passed; content validation covered 17 documents. Typechecks and production build passed.
- Both particle routes reached GPU-ready state in isolated desktop Chrome. Destroying the active native GPU device, attempting Resume, resizing and sending visibility events retained lost state with no uncaught JavaScript or GPU errors. Report: `/tmp/personal-site-adoption-browser/report.json`.
- The mounted PromptInput Strict Mode harness passed 28 cases, including legacy callbacks and explicit accepted/cancelled/unconfirmed outcomes in local/provider modes. Report: `/tmp/personal-site-adoption-prompt/report.json`.
- The homepage footer initialized a native GPU renderer, survived resize, released it under reduced motion and initialized a new one when motion was restored, with no uncaught GPU errors.
- The actual article typography panel loaded verified asset metrics and displayed cap-height measurements. Its browser report, including the footer checks, is `/tmp/personal-site-adoption-browser/ui-report.json`.
- The actual `AgentChat` component mounted under React Strict Mode with an injected local fetch failure. Exactly one request occurred, the draft remained, the error was visible and no unhandled exception occurred. Report: `/tmp/personal-site-agent-chat-browser/report.json`. This did not contact Eve or a model provider.
- Exporter tests exercised real controlled subprocess startup failure, termination and already signal-exited cleanup; they did not generate or replace public assets.
- `bun run verify` still stops at inherited lint/format failures. Formatting failures dropped from 190 to 177 files because touched files were formatted. No checks or rules were weakened.

The final chat ownership follow-up uses an I/O-free `useMemo` factory with explicit session identity and effect-owned mounting; existing named session routes remount by that identity. The correctness reviewer rechecked this change. Its 42 focused tests, typecheck and final production build passed. Final lint comparison has no positive per-file/rule diagnostic-count changes in the modified files; total inherited diagnostics decreased from 3,196 to 3,065, and all new modules are lint-clean. Changed-file formatting and whitespace checks passed.

The complete live Eve backend, real Chromium-to-FFmpeg export, physical devices and production remain unverified. The XState pair remains prerelease software. At the end of implementation validation, no commits, pushes or deployments had been made.
