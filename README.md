# Personal site

A Bun workspace powered by Turborepo, with the Next.js application in `apps/web`.

## Development

```bash
bun install
bun run dev
```

The site runs at [http://localhost:3000](http://localhost:3000).

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
