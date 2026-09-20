# Shared UI

`@personal-site/ui/components/*` exposes the shared Tailwind-styled components
used by `apps/web`. Their implementations live in `src/components`; the root
`@personal-site/ui` export continues to expose unstyled
[Base UI](https://base-ui.com/react/overview/quick-start) primitives.

Use `@personal-site/ui/lib/utils` for the shared `cn` class-name helper.
Use `tv` and `VariantProps` from `tailwind-variants` for typed component variants.
App consumers can import them alongside `cn` from `@personal-site/ui/lib/utils`.
Pass caller `className` into the recipe after its variant props; the default build
resolves Tailwind conflicts. Keep `cn()` for conditional classes without variants.
Use slots when one variant needs to style multiple parts together. Variant values
are type-checked; Tailwind utility strings are not.

The styled dialog, select, and menu exports compose Base UI's compound parts
through its shared state. For example, `Dialog`, `DialogTrigger`, and
`DialogContent` wrap Base UI's root, trigger, and popup. Styling slots do not
replace that component composition or require changing its public API.

Keep application-specific components (such as AI Elements) in the app.

Install workspace dependencies from the repository root with `bun install`.
Base UI is owned by this package. Both web and Storybook compile the shared
components with Tailwind CSS and `@tailwindcss/postcss`, using the same versions.

The consuming app uses Next.js, so it follows the
[Tailwind PostCSS setup](https://tailwindcss.com/docs/installation/using-postcss).
Storybook also uses the PostCSS integration through its Vite configuration.

`apps/web/src/app/globals.css` imports Tailwind and explicitly scans this package:

```css
@import "tailwindcss";
@import "@personal-site/ui/styles/theme.css";
@import "@personal-site/ui/styles/defaults.css";
@import "@personal-site/ui/styles/baseline.css";
@source "../../../../packages/ui/src";
```

`src/styles/theme.css` defines the Tailwind v4 semantic utilities. `defaults.css`
provides opt-in values: put `data-ui-theme="light"`, `"dark"`, or `"system"` on
one page-level wrapper. The CSS mirrors that mode to `body` so portaled popups
inherit the same tokens. Use one mode per document; nested or simultaneous themes
are not supported (Storybook isolates stories in its preview document).

The `dark:` variant follows that same explicit/system mode. Defaults use
`light-dark()` with `color-scheme`; no JavaScript theme initialization is needed.
Consumers can override the semantic variables in their own CSS. Shared fonts
use `--font-ui` and `--font-code`, with system fallbacks. The editorial stylesheet
maps `font-display` and `font-reading` to the consumer's editorial font variables,
with Georgia/serif fallbacks.

Web declares `theme, base, reset, components, utilities` in that order so its
baseline cannot override utilities. Editorial colors, including
`--color-editorial-muted`, remain separate from the shared UI surface tokens.

Editorial pages additionally import `@personal-site/ui/styles/editorial.css`.
That stylesheet owns paper, ink, supporting-text, and selection colors using
`@theme static`, making them available to both Tailwind utilities and CSS Modules.
It does not style elements, load fonts, or change light/dark UI tokens. Font
loading/preferences and page composition stay in `apps/web`; `design.md` at the
repository root documents those boundaries and the current visual rules.

## Typography

Import `Heading`, `Text`, `Typography`, and their recipes from
`@personal-site/ui/components/typography`. They work in Server Components and
client components without adding wrapper DOM or a client boundary.

- `Heading` provides editorial display, section, feature, item, and subtitle
  styles. Its `as` prop selects `h1` through `h6` independently of visual style.
- `Text` provides editorial body, small, caption, date, and metadata paragraphs.
  `Heading` and `Text` reset margins; consumers supply spacing and measure.
- `Typography` accepts a native HTML `as` element (default `span`) and a named
  role from `typographyVariants`. Shared roles cover UI text and code. It has no implicit font or margin reset;
  omitting `variant` preserves inherited styles, including authored MDX.
- Use `headingVariants()`, `textVariants()`, or `typographyVariants()` on
  existing components such as Next.js links, inputs, and interactive controls.
  Keep the caller's `className` last. Page-specific roles belong in the app.
- `apps/web/src/components/page-typography.tsx` owns journal, article, experiment,
  playground, and layout-study recipes plus canvas font shorthands. It composes
  shared roles without making the UI package depend on app markup.
- Authored Markdown typography lives in `apps/web/src/app/blog/prose.css`.
  Embedded components opt out of prose selectors with `data-prose-exclude` on
  their root. This excludes the root and descendants; normal CSS inheritance
  still applies, so embedded UI can explicitly choose `font-sans`.
- Font loading, preferences, and syntax-highlighter token styling remain with
  the consumer.

```tsx
import { Heading, Typography, typographyVariants } from "@personal-site/ui/components/typography";

<section>
  <Heading as="h3" variant="feature" className="mb-4">
    A second life for good things.
  </Heading>
  <Typography as="p" variant="uiBody">Choose an option to continue.</Typography>
  <button className={typographyVariants({ variant: "uiLabel" })}>
    Continue
  </button>
</section>;
```

**Editorial/Typography** in Storybook covers editorial variants, representative
shared roles, semantic elements, overrides, and font variables. It uses local
serif fallbacks; review loaded fonts and persisted preferences in the web app.

Popups use Base UI's `data-starting-style` / `data-ending-style` transitions,
with `motion-reduce:transition-none`; no animation plugin is required.

Follow the [Base UI styling guide](https://base-ui.com/react/handbook/styling)
to style components with `className` and state attributes such as `data-disabled`.
Keep Tailwind class names as complete strings so they can be detected at build time.

```tsx
"use client";

import { Button } from "@personal-site/ui/components/button";

export function Example() {
  return (
    <div data-ui-theme="system">
      <Button variant="outline" size="sm">
        Click me
      </Button>
    </div>
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
`src/stories`. **Shared UI/Theme** renders the actual buttons, inputs, select, and
dialog. Use its toolbar for light/dark/system mode; tab through controls to inspect
focus rings, and open popups to check portal inheritance. Disabled and invalid
states are included. The docs and accessibility addons are enabled.

**Editorial/Palette** shows the same palette consumed by the web app, including
a story alongside dark UI. It is a color reference using system sans-serif,
not a reproduction of the site's typography or layouts. **Shared UI/Page chrome**
documents `PageNavigation` and `Eyebrow`; starter stories are demonstrations only.

Next.js is a development dependency for the Storybook framework. The package's
public exports remain the shared UI components.

Before using portaled popups, follow the Base UI quick start: wrap the application
contents in an element with `isolation: isolate`, leaving portals outside that
element. For iOS 26+ Safari backdrops, use `position: relative` on the body and
`position: absolute` on the backdrop. These layout styles belong to the consuming app.

## Style ownership

Shared components own appearance and internal layout: padding, icon gaps,
control dimensions, typography, and states. Pages own composition: placement,
available width, grid tracks, and spacing between components. `Eyebrow` has no
external spacing; callers supply `mb-4`, a parent gap, or another explicit value.
`PageNavigation` supplies layout and inherited typography; callers style links.

Use Tailwind for shared UI and ordinary page composition. Use app CSS Modules
when complex grids, animation, or authored prose are clearer in CSS. Apply
classes to owned elements instead of reaching into children with `.controls
button`, `.page p`, or Tailwind equivalents such as `[&_button]`. Direct-child
placement is appropriate when a container deliberately owns those child slots.
Reserve shared semantic names (`--muted`, `--accent`, `--border`, etc.) for the
UI theme. Prefix page tokens, for example `--blog-accent` or `--experiment-muted`.

App-local `*-styles.ts` recipes compose utilities with the remaining CSS Module
layout classes. Keep these recipes in the owning app rather than exporting page
designs from this package. Variants belong on the elements they style.

Both web and Storybook import `styles/baseline.css` and declare cascade order
`theme, base, reset, components, utilities`. App component CSS lives in
`@layer components`; explicit caller utilities can override it. Each component
stylesheet repeats the order declaration before its layer block because Next
may load a module before globals. Layers control
precedence, not isolation: selectors must still respect component ownership.

Run the web app and open `/style-boundaries` for the development-only integration
fixture. It compares computed styles of real shared components inside article,
journal, and experiment wrappers with an isolated reference, and checks that
normal authored prose keeps its spacing. It rechecks on viewport resize. Test
both desktop and mobile widths. Storybook covers isolated component behavior;
the app fixture covers composition under the actual web reset and styles.
