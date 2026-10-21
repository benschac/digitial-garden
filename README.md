# Personal site

A Bun workspace powered by Turborepo, with the Next.js application in `apps/web`.

## Development

```bash
bun install
bun run setup:tools
bun run dev
```

The site runs at [http://localhost:3000](http://localhost:3000).

## Eve agent

The Next.js app includes a minimal [Eve](https://eve.dev) agent under
`apps/web/agent`. Eve requires Node.js 24 or newer; this repository declares
that requirement in its package manifests.

Use Node.js 24 or newer. With nvm, run `nvm install` and `nvm use` from the
project root to select the version pinned in `.nvmrc`.

Configure model access with `AI_GATEWAY_API_KEY` in `apps/web/.env.local`, or
link the app to a Vercel project with Eve. Then run either the site and agent on
one origin or the standalone terminal client:

```bash
bun run dev
bun --cwd apps/web run eve:dev
```

Use `bun --cwd apps/web run eve:info` to inspect the discovered agent surface.
The default browser channel accepts local development traffic but remains
fail-closed in production until an explicit authentication policy is added.

The agent includes Eve's introductory in-memory analytics example. Try asking:

```text
Which customer has spent the most, and how much?
How much revenue came from each customer plan in May 2026?
```

The `run_sql` tool queries a throwaway SQLite database seeded with four orders
and three customers. It does not connect to production data.

## WebGPU and WebAssembly experiment

The particle field at `/experiments/wasm-canvas` keeps its simulation state on
the GPU. Rust/WASM turns the current controls, dimensions, and timing into a
64-byte frame command. A WGSL compute shader uses that command to advance up to
4.2 million particles, an instanced render pass draws them, and ping-pong
textures preserve their trails without particle readback. The experiment starts
at 100,000 particles and exposes the larger range as an explicit stress test.

Above 450,000 particles, the renderer switches to one-pixel GPU points, a 1x
internal render target, and rotating simulation cohorts. Rust uses four
simulation cohorts above 1.2 million and eight above 2.4 million. Each render
cohort is capped at 1.05 million particles, so the 4.2-million-particle ceiling
rotates through four draws while the trail texture preserves the other cohorts.

Initial particle state is seeded by the compute shader directly in GPU memory.
After startup, the browser only copies the small Rust command to WebGPU each
frame; it never copies the particle array between WASM and the GPU.

Browsers without WebGPU use the original dependency-free Rust engine. The
browser loads `apps/web/public/wasm/particle-engine.wasm`, then Canvas 2D renders
the engine's shared-memory output.

The compiled module is committed so normal Next.js and Vercel builds do not
need a Rust toolchain. The available commands are:

```bash
bun run wasm:setup # install the Rust WASM target once
bun run wasm:build # compile once
bun run wasm:watch # recompile whenever the Rust source changes
bun run wasm:dev   # watch Rust and run Next.js together
```

The watch commands use a focused, dependency-free Bun watcher and require no
additional global watch utility.

## Blog content

Published blog posts live in `apps/web/content/posts` as Markdown or MDX files.
Markdown is the default; use MDX only when a post needs one of the explicitly
allowlisted components from `apps/web/src/mdx-components.tsx`. YAML frontmatter
is validated with Effect v4 Schema through Standard Schema by
`apps/web/content-collections.ts`. Content Collections
compiles the post bodies to MDX and generates typed data in
`apps/web/.content-collections` (ignored by Git). The server-only content helpers
serve that collection to the blog, RSS, sitemap, and tag routes.

`next dev` generates the collection and watches for post changes; `next build`
generates it before building routes. Run `bun run content:validate` to generate
and validate content independently. Typechecking and tests also generate it, so
they work on a fresh checkout. Invalid posts, duplicate slugs, missing cover
images, and disallowed MDX fail validation. Draft, archived, and future posts
remain excluded from public routes.

Blog compilation preserves GFM, math, heading IDs, syntax highlighting, and the
shared MDX components. `@next/mdx` remains for MDX experiment routes outside the
blog.

Set `SITE_URL` to the canonical production origin when building for deployment.
Without an explicit value, Vercel builds use `VERCEL_PROJECT_PRODUCTION_URL`,
then `VERCEL_URL`. Local builds default to `http://localhost:3000`.

## Animated link preview

The homepage advertises `public/social/home.mp4` through `og:video`, with
`public/social/home.jpg` as the Open Graph and Twitter image fallback. The
eight-second, silent H.264 loop uses the hero's `AvatarArtwork` and local
Bonbance font, with deterministic eye tracking and blinks.

Regenerate both committed assets from `apps/web` with `bun run social:render`.
This optional authoring step requires Chromium (`CHROMIUM_PATH` overrides the
`chromium` executable) and FFmpeg with libx264. Normal builds serve the committed
files and require neither tool. Keep `SITE_URL` set to the public HTTPS origin
so crawlers receive absolute media URLs. Video playback, looping, and autoplay
depend on the receiving app; clients that ignore `og:video` use the still image.
After deployment, test a fresh homepage link in Messages to verify its preview.
Visit `/social/preview.html` to watch the video with muted autoplay and looping
enabled. The clip returns to its starting pose for a seamless repeat. Open Graph
has no standard loop flag, so the receiving app controls whether link previews
repeat the video.

## Checks

```bash
bun run lint
bun run format:check
bun run check
bun run check-types
bun run content:validate
bun run test
bun run test:tools
bun run build
```

Linting and formatting use native Bun `lint` and `fmt`, configured in
`bunfig.toml`. The project-local tooling pin is
`1.4.4-canary.1+c0e1716f1`; stable Bun 1.4.3 remains the package manager.
Run `bun run setup:tools` once (macOS/Linux arm64 or x64; requires `unzip`).
The installer verifies the official archive checksum and exact revision. If the
moving canary archive changes, it refuses to install; review and update
`scripts/bun-tools-version.mjs` to upgrade. Global Bun is unchanged.

Run `bun run format` to format the workspace, `bun run lint:fix` for safe lint
fixes, or `bun run check:write` for both. Formatting also sorts imports; Tailwind
class order is preserved. Bun's rules differ from Biome's, so migration may
expose existing lint findings and formatting differences. There is no Biome
fallback. Existing TypeScript checks still use TypeScript.

The [rule coverage audit](docs/bun-rule-parity.md) maps the former Biome
recommended preset and React/Next domains to explicit Bun rules and records the
remaining JavaScript, CSS, and JSON gaps. Bun-only linting does not provide full
Biome parity. Run `bun run test:tools` to verify mapped rule severities and
representative diagnostics.

The project Codex Stop hook in `.codex/hooks.json` runs native Bun formatting
checks and lint on staged, unstaged, and untracked files. Checks are read-only,
respect ignored/generated paths, and skip deleted files and symlinks. Failures
request one follow-up pass; `stop_hook_active` prevents a continuation loop.
Use `/hooks` in Codex to review and trust the new hook before it can run. See
[official Codex hooks documentation](https://learn.chatgpt.com/docs/hooks).
