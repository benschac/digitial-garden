# Repository conventions

## Standard libraries and reusable hooks

- Before adding a dependency, utility, or browser lifecycle effect, check [the standard-library directory](docs/standard-libraries.md) and the owning package's exports.
- Reuse existing hooks for abortable work, animation frames, events, media queries, and observers when their lifecycle matches the feature. Extend a shared hook compatibly when a reusable capability is missing; keep feature-specific rendering and state in the app.
- Do not hide reactive dependencies just to use a helper. Check cancellation on restart/unmount, Strict Mode replay, async initialization, and observer readiness when refactoring effects.
- If a native API is needed because the shared helper cannot express its lifecycle, document that reason next to the effect rather than forcing the abstraction.
- Update the directory when adding or changing a shared API so future work can discover it. These are project-owned defaults, not permission to add dependencies.

## Tailwind class readability

- Split long Tailwind class lists into multiple string arguments to `cn()`, grouped by concern such as layout, appearance, typography, and interaction states.
- Keep short class lists on one line. When regrouping existing classes, preserve every class and its order so class merging behavior stays unchanged.
- Keep the caller's `className` as the last argument so overrides continue to work.
- Use Tailwind Variants (`tv`) when a component needs variants; do not introduce it solely to wrap a long class list.
- Use the existing Biome formatter. Do not add a formatter dependency or enable experimental class-sorting rules solely for readability.

## Style ownership

- Shared UI owns appearance and internal layout. Pages own placement, available width, and spacing between components.
- Prefer Tailwind for shared components and ordinary composition; use app CSS Modules for complex grids, motion, and authored prose.
- Apply classes to explicitly owned elements. Avoid page descendant element selectors and equivalent Tailwind arbitrary variants that reach into nested components.
- Keep page-specific typography and canvas recipes in `apps/web`; reserve `packages/ui` for reusable roles.
- Namespace page tokens (`--blog-*`, `--experiment-*`); do not reuse shared UI semantic tokens for unrelated page values.
- Put app component/module styles in `@layer components`. Declare `@layer theme, base, reset, components, utilities;` before each component stylesheet block: Next may load a module before globals, so the first loaded stylesheet must establish the same order.
- Authored prose must honor `data-prose-exclude` on embedded component roots and descendants. Inherited fonts/colors remain an explicit consumer choice.
- Verify boundary changes with the development `/style-boundaries` fixture at desktop and mobile widths, alongside relevant checks.
