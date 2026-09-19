# Shared UI

`@personal-site/ui/components/*` exposes the shared Tailwind-styled components
used by `apps/web`. Their implementations live in `src/components`; the root
`@personal-site/ui` export continues to expose unstyled
[Base UI](https://base-ui.com/react/overview/quick-start) primitives.

Use `@personal-site/ui/lib/utils` for the shared `cn` class-name helper.
Keep application-specific components (such as AI Elements) in the app.

Install workspace dependencies from the repository root with `bun install`.
Base UI is owned by this package; Tailwind CSS and `@tailwindcss/postcss` are
owned by `apps/web`, which compiles the shared components' styles.

The consuming app uses Next.js, so it follows the
[Tailwind PostCSS setup](https://tailwindcss.com/docs/installation/using-postcss).
The Vite plugin is only needed for a Vite consumer.

`apps/web/src/app/globals.css` imports Tailwind and explicitly scans this package:

```css
@import "tailwindcss";
@import "@personal-site/ui/styles/theme.css";
@source "../../../../packages/ui/src";
```

`src/styles/theme.css` defines the Tailwind v4 semantic utilities. Consumers supply
the underlying CSS variables (`--primary`, `--background`, `--radius`, and so on);
the web app retains its existing light/dark chat theme and editorial page styles.

Follow the [Base UI styling guide](https://base-ui.com/react/handbook/styling)
to style components with `className` and state attributes such as `data-disabled`.
Keep Tailwind class names as complete strings so they can be detected at build time.

```tsx
"use client";

import { Button } from "@personal-site/ui/components/button";

export function Example() {
  return (
    <Button variant="outline" size="sm">
      Click me
    </Button>
  );
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
