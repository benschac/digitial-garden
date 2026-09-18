# Personal site

A Bun workspace powered by Turborepo, with the Next.js application in `apps/web`.

## Development

```bash
bun install
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
is parsed once by the server-only content loader and validated with Zod.

Set `SITE_URL` to the canonical production origin when building for deployment.
Local builds default to `http://localhost:3000`.

## Checks

```bash
bun run lint
bun run format:check
bun run check
bun run check-types
bun run content:validate
bun run test
bun run build
```

Run `bun run format` to format the workspace or `bun run check:write` to apply safe
lint fixes, formatting, and import organization together.
