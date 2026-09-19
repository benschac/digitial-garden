# Shared UI

`@personal-site/ui` exposes the unstyled [Base UI](https://base-ui.com/react/overview/quick-start)
components. Add shared styling and composed components here as they are needed.

```tsx
"use client";

import { Button } from "@personal-site/ui";

export function Example() {
  return <Button onClick={() => console.log("Clicked")}>Click me</Button>;
}
```

This is a just-in-time workspace package: the consuming app compiles its TypeScript.
No separate build step is required. Run its checks through Turborepo:

```sh
bun run lint --filter=@personal-site/ui
bun run check-types --filter=@personal-site/ui
```

## Storybook

Storybook lives in this package and uses `@storybook/nextjs-vite`, the framework
recommended by the [Storybook Next.js guide](https://storybook.js.org/docs/get-started/frameworks/nextjs/).
Run it from the repository root through Turborepo:

```sh
bun run storybook
bun run build-storybook
```

`bun run dev` (or `b dev` with your Bun alias) starts Storybook alongside the web app.

The development server runs at `http://localhost:6006`. The static build is written
to `packages/ui/storybook-static`. Configuration lives in `.storybook`; add stories
under `src` using `*.stories.tsx` (or `*.stories.ts`). Generated examples are in
`src/stories`. The docs and accessibility addons are enabled.

Next.js is a development dependency for the Storybook framework. The package's
public exports remain the shared UI components.

Before using portaled popups, follow the Base UI quick start: wrap the application
contents in an element with `isolation: isolate`, leaving portals outside that
element. For iOS 26+ Safari backdrops, use `position: relative` on the body and
`position: absolute` on the backdrop. These layout styles belong to the consuming app.
