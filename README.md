# Personal site

A Bun workspace powered by Turborepo, with the Next.js application in `apps/web`.

## Development

Development tooling requires Node.js 24.15 or newer; `.nvmrc` pins a supported version.

```bash
bun install
bun run dev
```

`bun run dev` starts Gas City alongside the site. Stopping development also stops the city if this command started it; an already-running city stays running. The shared machine-wide supervisor stays running. Initialize Gas City once using the setup below before running development. Storybook is excluded from this command; run `bun run --cwd packages/ui storybook` when needed.

The development server prefers [http://localhost:3000](http://localhost:3000). If that port is occupied, it checks subsequent ports until it finds a free one and prints the selected URL. It does not stop the process using the original port.

Set a different preferred port through the shell or a CLI flag:

```bash
PORT=4000 bun run dev
bun run --cwd apps/web dev --port 4000
```

Both commands fall back to the next available port if `4000` is busy. CLI flags take precedence over `PORT`; do not put `PORT` in `.env.local`. This also applies to `bun run wasm:dev` and the web workspace's `dev` command. Production `next start` retains its fixed-port behavior.

This handles ports occupied by other projects. Next.js still permits only one development server per checkout because they share `.next/dev`; use a separate checkout or worktree to run two copies of this project.

## Gas City coding agents

[Gas City](https://github.com/gastownhall/gascity) coordinates coding agents for this repository. The setup below targets Gas City 1.5.1 and Codex CLI 0.166.0. It keeps the city in `.tools/gascity` and registers this checkout as the `personal-site` rig.

Install the CLI and initialize a new local city from the repository root:

```bash
brew install gascity
GC_BEADS=file command gc init --template minimal --default-provider codex --name personal-site --no-start .tools/gascity
cp gascity.toml .tools/gascity/city.toml
command gc --city .tools/gascity rig add "$PWD" --name personal-site --prefix site --default-branch main
command gc --city .tools/gascity config show --validate
```

Run initialization once per checkout. The checked-in `gascity.toml` is the setup template; Gas City maintains the local copy and stores the checkout path in `.tools/gascity/.gc/site.toml`. To update an existing city, edit its local configuration without overwriting the generated `[[rigs]]` entries.

The template uses `gpt-6.1-sol` with high reasoning effort, a workspace-write sandbox, and approvals on request. It replaces the built-in permission option because Gas City's Codex preset defaults to unrestricted execution. The file-backed work store needs no Beads or Dolt service. Agent hook installation is disabled. Generated state under `.tools/`, `.gc/`, and `.beads/` stays outside Git.

Inspect routing without creating work or launching an agent:

```bash
command gc --city .tools/gascity sling personal-site/codex "Inspect the repository without changing files" --dry-run --no-formula
```

After setup, `bun run dev` starts the city and site together. To open a Codex session in another terminal:

```bash
command gc --city .tools/gascity session new personal-site/codex
```

To route a task, run `command gc --city .tools/gascity sling personal-site/codex "Your task"`. Inspect the city with `command gc --city .tools/gascity status`, and stop it with `command gc --city .tools/gascity stop`.

The `command gc` form bypasses shell aliases such as Oh My Zsh's `gc` alias for Git commits. See the upstream [quickstart](https://github.com/gastownhall/gascity/blob/v1.5.1/docs/getting-started/quickstart.md) for orchestration workflows.

## Eve agent

The Next.js app includes a minimal [Eve](https://eve.dev) agent under `apps/web/agent`. Eve requires Node.js 24 or newer; this repository declares that requirement in its package manifests.

Use Node.js 24 or newer. With nvm, run `nvm install` and `nvm use` from the project root to select the version pinned in `.nvmrc`.

Configure model access with `AI_GATEWAY_API_KEY` in `apps/web/.env.local`, or link the app to a Vercel project with Eve. Then run either the site and agent on one origin or the standalone terminal client:

```bash
bun run dev
bun --cwd apps/web run dev:eve
```

Use `bun --cwd apps/web run eve:info` to inspect the discovered agent surface. The default browser channel accepts local development traffic but remains fail-closed in production until an explicit authentication policy is added.

The agent includes Eve's introductory in-memory analytics example. Try asking:

```text
Which customer has spent the most, and how much?
How much revenue came from each customer plan in May 2026?
```

The `run_sql` tool queries a throwaway SQLite database seeded with four orders and three customers. It does not connect to production data.

## WebGPU and WebAssembly experiment

The particle field at `/experiments/wasm-canvas` keeps its simulation state on the GPU. Rust/WASM turns the current controls, dimensions, and timing into a 64-byte frame command. A WGSL compute shader uses that command to advance up to 4.2 million particles, an instanced render pass draws them, and ping-pong textures preserve their trails without particle readback. The experiment starts at 100,000 particles and exposes the larger range as an explicit stress test.

Above 450,000 particles, the renderer switches to one-pixel GPU points, a 1x internal render target, and rotating simulation cohorts. Rust uses four simulation cohorts above 1.2 million and eight above 2.4 million. Each render cohort is capped at 1.05 million particles, so the 4.2-million-particle ceiling rotates through four draws while the trail texture preserves the other cohorts.

Initial particle state is seeded by the compute shader directly in GPU memory. After startup, the browser only copies the small Rust command to WebGPU each frame; it never copies the particle array between WASM and the GPU.

Browsers without WebGPU use the original dependency-free Rust engine. The browser loads `apps/web/public/wasm/particle-engine.wasm`, then Canvas 2D renders the engine's shared-memory output.

The compiled module is committed so normal Next.js and Vercel builds do not need a Rust toolchain. The available commands are:

```bash
bun run wasm:setup # install the Rust WASM target once
bun run wasm:build # compile once
bun run wasm:watch # recompile whenever the Rust source changes
bun run wasm:dev   # watch Rust and run Next.js together
```

The watch commands use a focused, dependency-free Bun watcher and require no additional global watch utility.

## Blog content

Published blog posts live in `apps/web/content/posts` as Markdown or MDX files. Markdown is the default; use MDX only when a post needs one of the explicitly allowlisted components from `apps/web/src/mdx-components.tsx`. YAML frontmatter is validated with Effect v4 Schema through Standard Schema by `apps/web/content-collections.ts`. Content Collections compiles the post bodies to MDX and generates typed data in `apps/web/.content-collections` (ignored by Git). The server-only content helpers serve that collection to the blog, RSS, sitemap, and tag routes.

`next dev` generates the collection and watches for post changes; `next build` generates it before building routes. Run `bun run content:validate` to generate and validate content independently. Typechecking and tests also generate it, so they work on a fresh checkout. Invalid posts, duplicate slugs, missing cover images, and disallowed MDX fail validation. Draft, archived, and future posts remain excluded from public routes.

Blog compilation preserves GFM, math, heading IDs, syntax highlighting, and the shared MDX components. `@next/mdx` remains for MDX experiment routes outside the blog.

Set `SITE_URL` to the canonical production origin when building for deployment. Without an explicit value, Vercel builds use `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`. Local builds default to `http://localhost:3000`.

## Animated link preview

The homepage advertises `public/social/home.mp4` through `og:video`, with `public/social/home.jpg` as the Open Graph and Twitter image fallback. The eight-second, silent H.264 loop uses the hero's `AvatarArtwork` and local Bonbance font, with deterministic eye tracking and blinks.

Regenerate both committed assets from `apps/web` with `bun run social:render`. This optional authoring step requires Chromium (`CHROMIUM_PATH` overrides the `chromium` executable) and FFmpeg with libx264. Normal builds serve the committed files and require neither tool. Keep `SITE_URL` set to the public HTTPS origin so crawlers receive absolute media URLs. Video playback, looping, and autoplay depend on the receiving app; clients that ignore `og:video` use the still image. After deployment, test a fresh homepage link in Messages to verify its preview. Visit `/social/preview.html` to watch the video with muted autoplay and looping enabled. The clip returns to its starting pose for a seamless repeat. Open Graph has no standard loop flag, so the receiving app controls whether link previews repeat the video.

## Checks

`bun run verify` is the fast agent gate: Turbo selects affected lint, formatting, tooling tests, typechecks, and application tests using task inputs, then reuses successful cached results. It does not build the application. By default, affected selection compares the current branch against `main`, including staged, unstaged, and untracked changes. Use `TURBO_SCM_BASE=HEAD TURBO_SCM_HEAD=HEAD bun run verify` for only current uncommitted changes. `bun run verify --dry=json` shows selected tasks, inputs, hashes, and cache status without running them.

`bun run verify:full` checks every task and the production build, reusing valid cache entries. It runs serially because Next also writes generated content during its build. Content generation is one cached prerequisite shared by typechecks and application tests. The repository-post integration test runs separately as `test:content`, with its own content and validation inputs, so ordinary component edits reuse its cached result. GitHub Actions runs this full gate after a frozen-lockfile install and restores `.turbo/cache` across runs. Repository branch protection must require the `verify` job separately; the workflow alone does not prevent merging.

PR verification uses `scripts/stack-ci.mjs` with GitHub's automatically provided job token; no Graphite subscription or additional secret is required. It skips verification when an open same-repository PR targets the current PR's branch, leaving standalone PRs, stack tips, and fork PRs on the normal verification path. The lookup paginates and runs verification on errors or uncertain results. Feature-branch pushes do not start duplicate Actions runs; `main`, merge queues, and manual runs always verify. Decisions reflect the stack when the workflow runs: closing or retargeting a child PR alone does not rerun its former parent, so rerun that parent's workflow when needed.

Vercel previews use the small `scripts/vercel-ignore-build.mjs` guard to skip temporary Graphite branches and branches with an open same-repository child PR. Production always builds. The guard uses the public GitHub API and continues building on errors, rate limits, or uncertain results. It checks up to 100 child PRs; a child beyond that limit may cause an extra build. Keep Vercel's project root at `apps/web` and expose system environment variables. Decisions reflect the stack when the build starts; skipped deployments appear as canceled and still count toward Vercel's deployment limits.

Task inputs distinguish authored blog content from repository documentation. Shared source changes invalidate consumer checks through transit tasks; documentation and Storybook image assets do not trigger application checks or builds. Storybook source remains a build input because Tailwind scans it. Lint/format configuration, ignore files, installed tool versions, and vendored plugin changes invalidate the corresponding checks. Cache directories are local to each checkout because generated content can contain absolute paths.

`bun run check-types` and `bun run test` use the same affected selection as `verify`. Use `bun run check-types:all` or `bun run test:all` to select every package. Selection is per package, with repository-post validation cached separately. Syntax-only lint runs independently of consumer transit tasks. Route/content generation hashes route files, content tooling, authored content, public assets, and configuration, so unrelated component edits reuse its cached output.

Import restrictions keep shared package source independent of the web app and require app consumers to use public package exports. These are syntax-based static import/re-export checks, not a whole-program dependency graph: computed imports, CommonJS calls, and new path aliases need review. TypeScript suppression directives are errors. Assertion invariants belong in the change summary under `AGENTS.md`, so the conflicting safety-comment rule is disabled; the other assertion rules remain enabled.

```bash
bun run lint
bun run format:check
bun run check
bun run check-types
bun run check-types:effect
bun run content:validate
bun run test
bun run test:tools
bun run build
```

`bun run check-types:effect` generates route/content types and checks the web project with the [Effect-patched `tsrs`](https://github.com/Effect-TS/tsgo/blob/7d25af7531707a9a728b4f7c337f8694c1b4ee16/README.md#run-the-patched-tools-without-patching). It pins `@effect/tsgo` 0.63.0 and `tsrs` `0.20.1-ts7.1.0-beta`, uses no incremental cache, and fails on Effect errors and warnings. The default checks and build retain TypeScript 7.0.2.

The additional check currently fails on four TS2615 content-AST errors and three Effect warnings in `particle-lifecycle.ts` and `renderer-lifecycle.ts`. Patched TypeScript 7.1 beta reports the same errors. Resolve these before making it the default.

Editors must launch the patched language server with `bun run effect-tsgo tsrs@0.20.1-ts7.1.0-beta --lsp --stdio`; editor integration is unverified.

Linting uses Oxlint with Ultracite's core, React, and Next.js presets in `oxlint.config.mts`. Formatting uses Ultracite's Oxfmt preset in `oxfmt.config.mts`. `bun install` installs the tools.

Run `bun run format` to format the workspace or `bun run lint:fix` for safe lint fixes. Both accept paths, for example `bun run format scripts/agent-sources.mjs`. Formatting sorts imports and package.json fields; Tailwind class sorting stays disabled to preserve class order and `cn()` behavior.

[Anti-slop](https://github.com/dmmulroy/anti-slop) is vendored under `tools/oxlint/anti-slop`, with its generic and Effect rules enabled. Source identity and local adaptations are recorded in its `UPSTREAM.md`. Keep `oxlint` and `@oxlint/plugins` pinned to the same exact version when upgrading. The [coverage audit](docs/oxc-rule-parity.md) records the former Biome mappings and remaining gaps. Oxlint does not lint CSS or JSON. Type-aware linting is not enabled; the existing TypeScript checks remain separate.

ESLint is not installed or invoked by this workspace. Oxlint owns linting; its built-in `eslint/...` rule names and the vendored compatibility API do not run ESLint. Ultracite lists ESLint as an optional peer for its other presets, which does not install or enable it here.

The source backlog from the stricter presets is resolved. Narrow framework adaptations preserve Effect error factories, GPU binary field order and bitwise operations, canvas/SVG accessibility, React child adapters, and explicit DOM measurement restart dependencies. The [coverage audit](docs/oxc-rule-parity.md) explains these boundaries. Run `bun run test:tools` to check mapped rule severities, package boundaries, framework exceptions, and vendored plugin registration.

`git commit` does not run automatic verification. Run `bun run verify` before committing; GitHub Actions runs `bun run verify:full`.
