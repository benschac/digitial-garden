# Animated blog diagrams

## Static Mermaid figures

Use `MermaidDiagram` for static flowcharts and other Mermaid diagrams. Pele `1.12.0` loads on the client and mounts an SVG that adapts to its container. The static title and caption render on the server. Keep Giotto's `AnimatedDiagram` for narrated playback.

```mdx
<MermaidDiagram
  title="Balance and history"
  source="flowchart TD; A[Lock account] --> B[Update balance]; B --> C[Append ledger row]; C --> D[Commit];"
  description="The balance update and ledger insert share one database transaction."
/>
```

Use literal string properties and semicolons between flowchart statements. The source must be trusted repository content. The component disables diagram links and images, supplies unique SVG IDs separate from the figure IDs, and retains the description on parse failure. Pele owns resize and font observation plus its keyboard zoom controls. The component cancels pending initialization and destroys the mounted diagram on source changes, Strict Mode replay, and unmount. Colors and the label font use the article's paper/ink palette and UI font token.

The ledger draft at `/blog/creating-double-sided-accounting` exercises three figures inside authored prose. Check that route and `/style-boundaries` at desktop and 390px widths when changing the figure boundary. Run:

```sh
cd apps/web
bun run content:validate
bun test --timeout 30000 src/components/mdx/mermaid-diagram.test.tsx src/lib/content/source.test.ts src/mdx-components.test.tsx
```

`AnimatedDiagram` wraps Giotto's SVG web component. The first use is the draft `how-we-use-effect-in-snap-to-post.mdx`, replacing system-flow placeholder 0. This is a narrated illustration, not an executing Effect queue or measured trace. The queue-widget placeholders are separate work.

## Author a figure

1. Add a trusted JSON file at `apps/web/public/diagrams/name.json` (lowercase letters, numbers and hyphens). Start from `snap-to-post-identification.json`.
2. Define `elements` with unique IDs. Arrows connect `start.id` to `end.id`; `fromSide` / `toSide` select attachment sides on the arrow itself.
3. Add nonempty `scenes`, each with a `label` and `beats`. A beat's `edges: { edge: "arrow-id", data: "Packet label", back: true }` sends a packet; omit `back` for forward travel. `say` supplies synchronized text narration. `light: ["node-id"]` highlights nodes. `speed` is milliseconds per beat.
4. Embed it with literal strings (MDX imports/expressions remain disabled):

```mdx
<AnimatedDiagram
  src="/diagrams/name.json"
  title="A short figure title"
  description="A complete static explanation of the flow and its limitations."
/>
```

The description is server-rendered and remains visible. Playback starts paused. Reduced motion shows the static description without initializing the player; changing that preference cleans up an active player. Fetch/import failures keep the description and show an unavailable message. JSON is trusted author content, not a user-upload format: Giotto renders SVG markup internally.

In TSX, optional props are `autoplay` (boolean, default false), `theme` (`light` or `dark`, otherwise follows the system), and `className`. Controls are Giotto's native scene buttons, previous/next beat, play/pause, 1×/2× and fullscreen/Escape. The site supplies paper/ink colors and its UI font. Narrow views use Giotto's built-in scaling and contained horizontal scrolling; fullscreen provides room.

## Verified upstream contract

Pinned source: [b0809dc](https://github.com/nicoloboschi/giotto/tree/b0809dc037358f21e5e1ebe3dcbdf257b432a4aa). Inspected `lib/player.js`, `lib/scenes.js`, `lib/render.js`, `lib/styles.js`, `examples/player.html`, README and the actual Hindsight `Figure.tsx` and manifest. Hindsight still uses `8268996`; the current pin adds fullscreen resize handling. There is no published JSON Schema or TypeScript declaration in this revision. Our small ambient declaration covers only the public surface used by the wrapper. Giotto's `sceneWarnings` and renderer are used by the diagram validation test.

The `giotto/player` import happens inside a cancellable client effect. Source, theme and autoplay changes replace the player; removing it invokes upstream observer/listener/animation-frame cleanup. We fetch JSON ourselves for HTTP error handling and cancellation; native `src` does neither. No custom animation engine or additional browser animation dependency is used. Giotto brings its own `@resvg/resvg-js` export dependency, which is not imported by the browser player.

## Checks

Run `bun run check-types`, `bun run test`, `bun run lint`, and `bun run build`. In development, inspect the article and `/style-boundaries/diagrams` (theme, missing file, remount), plus `/style-boundaries`. Check desktop and 390px widths, keyboard playback, scene/step/speed controls, fullscreen/Escape, and the browser's reduced-motion setting. Draft articles and these fixtures remain production-hidden.
