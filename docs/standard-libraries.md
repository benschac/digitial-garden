# Standard-library directory

Check this directory before writing a new helper or adding a dependency. Read the
linked implementation and its types before reuse; the source owns the contract.

## React and browser lifecycle

Import these from `@personal-site/react-hooks`. Public exports live in
[`packages/react-hooks/src/index.ts`](../packages/react-hooks/src/index.ts).

| Need | Existing API | Lifecycle |
| --- | --- | --- |
| One active cancellable operation | [`useAbortController`](../packages/react-hooks/src/use-abort-controller.ts) | Returns a stable controller factory. Call from an event/effect; each call aborts the previous operation. Unmount aborts the active controller. Effect callers also abort in their own cleanup. |
| Abortable initialization with teardown | [`useAbortableEffect`](../packages/react-hooks/src/use-abortable-effect.ts) | Receives a fresh signal per activation; aborts before cleanup. Optional `enabled` defaults to true. Callback changes do not restart it. |
| On-demand animation frames | [`useAnimationFrame`](../packages/react-hooks/src/use-animation-frame.ts) | Stable request/cancel controls; deduplicates pending frames and cancels on unmount. Callback returns whether to continue. |
| Window/document events | [`useWindowEvent`, `useDocumentEvent`](../packages/react-hooks/src/use-browser-lifecycle.ts) | Subscribe with current callbacks and automatic teardown. Keep window listener options stable. |
| Media-query changes | [`useMediaQuery`](../packages/react-hooks/src/use-browser-lifecycle.ts) | Calls the listener initially and on changes; returns no state. |
| Element size changes | [`useResizeObserver`](../packages/react-hooks/src/use-browser-lifecycle.ts) | Takes a stable element ref and listener; measures initially and on resize. Optional `enabled` disconnects/reconnects observation. |
| Element visibility | [`useIntersectionObserver`](../packages/react-hooks/src/use-browser-lifecycle.ts) | Takes a stable element ref and reports viewport intersection with default observer options. |

Refs must point to mounted elements when observation starts. If initialization is
asynchronous, observers may fire before the resource is ready: guard the callback
and perform the initial draw/measurement when initialization completes.

`useAbortableEffect` is for component-lifetime or explicitly enabled work, not a
replacement for arbitrary reactive effects. If a URL, resource ID, or other value
must restart an operation, use an ordinary effect with those dependencies and a
controller from `useAbortController`. Never retain one aborted controller across
effect setups. Recheck the signal after awaits, and dispose resources that finish
initializing after cancellation.

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

- React Compiler is enabled through `reactCompiler: true` in
  `apps/web/next.config.mjs`, using the web package's pinned
  `babel-plugin-react-compiler` dependency. Next injects it before the existing
  TypeGPU Babel plugin; do not add a duplicate entry in `.babelrc`. Keep hooks
  compliant with React's rules and do not remove existing memoization solely
  because compilation is enabled.
- Use `next/image`, `next/link`, `next/font`, and `next/script` for their existing
  framework roles. Keep static content in Server Components and interactive
  browser behavior behind a client boundary.
- Read installed Next.js guides in `apps/web/node_modules/next/dist/docs` for the
  repository's version before changing framework behavior.
- Use existing Bun workspace scripts, native Bun lint/format, and TypeScript
  checks; do not add overlapping formatting, package-management, or validation
  tools. Run `bun run setup:tools` to install the pinned local lint/format binary;
  see [tooling setup and the Codex hook](../README.md#checks).

When introducing a reusable API, add its export, document ownership and lifecycle
here, and verify both its new caller and existing callers. Prefer the smallest
abstraction that handles the real lifecycle.

## Animated article figures

[`AnimatedDiagram`](../apps/web/src/components/mdx/animated-diagram.tsx) owns the
Giotto client boundary, cancellable JSON loading, static description and scoped
paper/ink theme. Giotto owns SVG rendering and playback. Use repository-owned
`public/diagrams/*.json`; see [authoring and verification](animated-diagrams.md).

[`EffectWalkthrough`](../apps/web/src/components/mdx/effect-walkthrough.tsx) owns
the Effect article's compact code-and-state figures. Its literal `kind` selects
`factory`, `coalescing`, `cancellation`, or `cleanup` from prepared source examples.
It starts paused, supports direct steps and replay, and pauses when hidden or out
of view. Reduced motion retains manual steps without automatic playback or motion.
The examples illustrate source behavior; they do not execute Effect or requests.

[`article-code-theme`](../apps/web/src/components/mdx/article-code-theme.ts)
shares the article's `github-dark-dimmed` Shiki theme with walkthroughs and SVG
function traces. It lazily loads only TypeScript and that theme, caches tokens,
and retains readable plain code if highlighting fails. Giotto's SVG replacement
observer is scoped to the player and disconnected when it is removed.

## Article typography inspection

[`TypographyInspector`](../apps/web/src/app/typography-inspector.tsx) extends the
development font panel with exact-asset Capsize metrics, reversible edge trimming,
DOM baseline guides and CSS export. [`ArticleRhythmInspector`](../apps/web/src/app/article-rhythm-inspector.tsx)
owns optional article leading, outer spacing and DOM gap previews. Both restore
page styles on teardown; see [usage and measurement boundaries](typography-inspector.md).
