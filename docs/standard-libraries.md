# Standard-library directory

Check this directory before writing a new helper or adding a dependency. Read the linked implementation and its types before reuse; the source owns the contract.

## React and browser lifecycle

Import these from `@personal-site/react-hooks`. Public exports live in [`packages/react-hooks/src/index.ts`](../packages/react-hooks/src/index.ts).

| Need | Existing API | Lifecycle |
| --- | --- | --- |
| One active cancellable operation | [`useAbortController`](../packages/react-hooks/src/use-abort-controller.ts) | Returns a stable controller factory. Call from an event/effect; each call aborts the previous operation. Unmount aborts the active controller. Effect callers also abort in their own cleanup. |
| Abortable initialization with teardown | [`useAbortableEffect`](../packages/react-hooks/src/use-abortable-effect.ts) | Receives a fresh signal per activation; aborts before cleanup. Optional `enabled` defaults to true. Callback changes do not restart it. |
| On-demand animation frames | [`useAnimationFrame`](../packages/react-hooks/src/use-animation-frame.ts) | Stable request/cancel controls; deduplicates pending frames and cancels on unmount. Callback returns whether to continue. |
| Window/document events | [`useWindowEvent`, `useDocumentEvent`](../packages/react-hooks/src/use-browser-lifecycle.ts) | Subscribe with current callbacks and automatic teardown. Keep window listener options stable. |
| Media-query changes | [`useMediaQuery`](../packages/react-hooks/src/use-browser-lifecycle.ts) | Calls the listener initially and on changes; returns no state. |
| Element size changes | [`useResizeObserver`](../packages/react-hooks/src/use-browser-lifecycle.ts) | Takes a stable element ref and listener; measures initially and on resize. Optional `enabled` disconnects/reconnects observation. |
| Element visibility | [`useIntersectionObserver`](../packages/react-hooks/src/use-browser-lifecycle.ts) | Takes a stable element ref and reports viewport intersection with default observer options. |

Refs must point to mounted elements when observation starts. If initialization is asynchronous, observers may fire before the resource is ready: guard the callback and perform the initial draw/measurement when initialization completes.

`useAbortableEffect` is for component-lifetime or explicitly enabled work, not a replacement for arbitrary reactive effects. If a URL, resource ID, or other value must restart an operation, use an ordinary effect with those dependencies and a controller from `useAbortController`. Never retain one aborted controller across effect setups. Recheck the signal after awaits, and dispose resources that finish initializing after cancellation.

## App-owned Effect workflows

- [`renderer-lifecycle`](../apps/web/src/app/experiments/wasm-canvas/renderer-lifecycle.ts) bridges Promise-based particle construction to an Effect scope. Register each native allocation immediately; the returned renderer keeps the scope alive until its idempotent `destroy()`. Nonabortable acquisitions finish under ownership before cancellation releases them. Drawing remains synchronous.
- [`particle-initialization`](../apps/web/src/app/experiments/wasm-canvas/particle-initialization.ts) shares GPU-to-WASM fallback across the particle experiments and header. Inject factories and the hook's abort signal; cancellation never starts fallback and late results are destroyed. React still owns activation, state and teardown.
- [`particle-lifecycle`](../apps/web/src/app/experiments/wasm-canvas/particle-lifecycle.ts) uses the pinned XState Effect bridge to own initialization, fallback, readiness, device loss and disposal across the particle pages and header. Its synchronous cancellation fence blocks native calls immediately after loss while the actor processes events. Animation eligibility remains separate from renderer availability; React hooks own frames and browser observers.
- [`code-block-highlighting`](../apps/web/src/components/ai-elements/code-block-highlighting.ts) coalesces chat highlighting by full source and language, bounds token storage, and expires failures immediately. Subscriptions return cleanup callbacks; unsubscribing leaves shared work available to other consumers. Article highlighting retains its separate language and theme configuration.
- [`typography-metrics-schema`](../apps/web/src/app/typography-metrics-schema.ts) validates external font metrics before measurement and caching. [`conversation-scroll`](../apps/web/src/components/ai-elements/conversation-scroll.ts) validates persisted scroll state and contains storage access failures.

- [`prompt-input-attachments`](../apps/web/src/components/ai-elements/prompt-input-attachments.ts) converts blob attachments with abortable fetch and FileReader adapters, at most three at a time. Its submission coordinator suppresses duplicate sends and clears input only after successful, current completion. `PromptInput` supplies an abort signal through optional submission context and retains text/files on conversion or unconfirmed send failure. Legacy void-returning callbacks remain supported; explicit outcome callbacks distinguish acceptance, cancellation and unconfirmed delivery. Aborting local work does not undo server acceptance.
- [`agent-chat-submission`](../apps/web/src/app/_components/agent-chat-submission.ts) observes Eve's public client acceptance responses through the authoritative Eve store. Its explicit accepted/cancelled/unconfirmed outcomes prevent a resolved Eve error from clearing the composer. Each send has separate identity. An Effect callback owns single-shot acceptance settlement; `Effect.ensuring` removes the abort listener and acceptance registration after every outcome. Accepting a message detaches composer cancellation from its ongoing stream. Session streaming, resume and durable cancellation remain Eve-owned.
- [`sample-db`](../apps/web/agent/lib/sample-db.ts) keeps one lazy module-lifetime Effect runtime behind the existing Promise API. `createSampleDb` creates an isolated owner; its `dispose` permanently closes that owner. The default owner exposes `disposeSampleDb`. The host must call disposal when ending that lifetime. [`sample-db-service`](../apps/web/agent/lib/sample-db-service.ts) coalesces initialization, expires initialization failures immediately, and owns database cleanup. SQL queries are never retried, and this service does not enforce read-only SQL authorization.
- [`watch-wasm-lifecycle`](../apps/web/scripts/watch-wasm-lifecycle.ts) owns filesystem watchers, signal handlers, debounce queues and child processes in an Effect scope. Native adapters remain in `watch-wasm.ts`. Builds run serially with a 120ms debounce and one pending rebuild; shutdown discards queued work, terminates the direct child and waits for its exit before releasing the scope.

## UI, styling, and motion

| Need | Existing owner |
| --- | --- |
| Styled reusable controls and typography | [`packages/ui/src/components`](../packages/ui/src/components), imported via `@personal-site/ui/components/*` |
| Class merging | [`cn`](../packages/ui/src/lib/utils.ts), imported via `@personal-site/ui/lib/utils` |
| Component variants | Existing Tailwind Variants (`tv`) conventions in shared UI; do not add it solely for long class lists |
| Springs and motion values | Existing `motion/react` dependency; use the frame hook for imperative drawing rather than React state per frame |
| Homepage avatar gaze and blinking | [`useAvatarAnimation`](../apps/web/src/app/_components/home/use-avatar-animation.ts) owns the hero/footer eye and brow tracking plus blinking. Attach its ref to a mounted wrapper containing only the portrait SVG; it handles viewport/tab visibility, reduced motion, fine-pointer tracking, and cleanup while preserving the artwork's resting transforms. |
| Homepage navigation hover | [`NavigationHighlight`](../apps/web/src/app/_components/home/primary-navigation.tsx) owns the clipped duplicate row shared by primary and social navigation. Optional per-link `data-highlight-color` sets the fill; row classes and clipping padding preserve each caller's layout. Uses shared media-query, resize, and document-event hooks to clear stale hover state; the duplicate is inert and hidden from assistive technology. |
| Page typography and feature effects | Keep in `apps/web`; for example [`useWetInk`](../apps/web/src/app/use-wet-ink.ts) composes shared lifecycle hooks but owns ink rendering |

## Next.js and tooling

- [Library source references](agent-sources.md) provides pinned, reference-only Effect, XState core, and XState Effect checkouts. `bun run sources:fetch` downloads them; `sources:check` validates them; `sources:updates` reports registry tags without upgrading dependencies.

- Runtime validation uses `effect/Schema` (Effect v4). Blog metadata and document schemas live in `apps/web/src/lib/content/schema.ts`; use the exported parser options to reject unknown frontmatter keys and collect all validation issues. Content Collections consumes `Schema.toStandardSchemaV1`. Eve tools also need `Schema.toStandardJSONSchemaV1`; expose the resulting `~standard` property in a plain object because Eve's schema detection does not accept function values.

- React Compiler is enabled through `reactCompiler: true` in `apps/web/next.config.mjs`, using the web package's pinned `babel-plugin-react-compiler` dependency. Next injects it before the existing TypeGPU Babel plugin; do not add a duplicate entry in `.babelrc`. Keep hooks compliant with React's rules and do not remove existing memoization solely because compilation is enabled.
- Use `next/image`, `next/link`, `next/font`, and `next/script` for their existing framework roles. Keep static content in Server Components and interactive browser behavior behind a client boundary.
- Read installed Next.js guides in `apps/web/node_modules/next/dist/docs` for the repository's version before changing framework behavior.
- [`dev-port.mjs`](../apps/web/scripts/dev-port.mjs) owns development port selection: CLI port flags override shell `PORT`, then default to 3000. It probes the requested bind address and subsequent ports, releasing the probe before [`dev.mjs`](../apps/web/scripts/dev.mjs) launches Next's CLI. Only address-in-use errors trigger fallback; production startup is unchanged.
- Keep static VGPU shaders in `.wgsl` files. The web app's `wgslTurbopackRule()` prepares typed shader imports at build time; keep `vgpu` and `@vgpu/wgsl` on matching versions. See [`wet-ink-renderer`](../apps/web/src/app/wet-ink-renderer.ts).
- Use existing Bun workspace scripts, Oxlint/Oxfmt with Ultracite presets, and TypeScript checks. `bun install` installs the pinned tools; no separate setup command is needed. Project rules and vendored anti-slop registration live in `oxlint.config.mts`; `oxfmt.config.mts` preserves authored Tailwind class order. See [tooling setup and the Codex hook](../README.md#checks).

When introducing a reusable API, add its export, document ownership and lifecycle here, and verify both its new caller and existing callers. Prefer the smallest abstraction that handles the real lifecycle.

## Animated article figures

[`MermaidDiagram`](../apps/web/src/components/mdx/mermaid-diagram.tsx) renders trusted, repository-authored Mermaid source with Pele on the client. Pass literal `source`, `title`, and `description` strings in MDX. It owns the SVG IDs, paper/ink palette and server-rendered caption; links and images are disabled. Pele owns responsive layout, font observation and keyboard zoom. The wrapper cancels pending imports and destroys mounted diagrams on restart/unmount. Failures retain the caption. See [authoring](animated-diagrams.md#static-mermaid-figures).

[`AnimatedDiagram`](../apps/web/src/components/mdx/animated-diagram.tsx) owns the Giotto client boundary, cancellable JSON loading, static description and scoped paper/ink theme. Giotto owns SVG rendering and playback. Use repository-owned `public/diagrams/*.json`; see [authoring and verification](animated-diagrams.md).

[`EffectWalkthrough`](../apps/web/src/components/mdx/effect-walkthrough.tsx) owns the Effect article's compact code-and-state figures. Its literal `kind` selects `factory`, `coalescing`, `cancellation`, or `cleanup` from prepared source examples. It starts paused, supports direct steps and replay, and pauses when hidden or out of view. Reduced motion retains manual steps without automatic playback or motion. The examples illustrate source behavior; they do not execute Effect or requests.

[`article-code-theme`](../apps/web/src/components/mdx/article-code-theme.ts) shares the article's `github-dark-dimmed` Shiki theme with walkthroughs and SVG function traces. It lazily loads only TypeScript and that theme, caches tokens, and retains readable plain code if highlighting fails. Giotto's SVG replacement observer is scoped to the player and disconnected when it is removed.

## Article typography inspection

[`TypographyInspector`](../apps/web/src/app/typography-inspector.tsx) extends the development font panel with exact-asset Capsize metrics, reversible edge trimming, DOM baseline guides and CSS export. [`ArticleRhythmInspector`](../apps/web/src/app/article-rhythm-inspector.tsx) owns optional article leading, outer spacing and DOM gap previews. Both restore page styles on teardown; see [usage and measurement boundaries](typography-inspector.md).
