# Personal site design guide

Use this guide when building or changing Benjamin Schachter's personal site and
shared UI. Start with the reader's task, then reuse the relevant existing page's
composition and styles. Explicit task instructions take precedence over this guide.

This guide records the current implementation as of September 20, 2026. Its
visual direction comes from the site's source, not a separate brand brief or a
generation evaluation. Browser checks for a particular change establish only
that change's validation scope; they do not make this guide a visual acceptance
baseline.

## Identity and purpose

The site presents a software engineer's work, writing, and interactive experiments.
Its public editorial surfaces use warm paper, dark ink, expressive serif headings,
readable serif prose, and restrained system-sans navigation. Hierarchy comes from
type size, whitespace, and thin rules.

- Home: identify Benjamin, expose a few useful destinations, feature speaking,
  and show past work with a selected-project detail.
- Blog: help readers choose an article and comfortably read technical writing.
- Playground: provide a short index into hands-on experiments.
- Experiments: give the visualization and its controls the space they need.
- Chat/workbench: support an application workflow with its own scoped theme.

Keep these page types distinct. A new article should inherit the editorial system;
a simulation may need a full-width canvas and specialized colors.

## Source of truth

Read the owning files before implementing a change. Values below are reference
values; update this guide if an intentional design change supersedes them.

| Concern | Owning source |
| --- | --- |
| Shared editorial palette | `packages/ui/src/styles/editorial.css` |
| Editorial font roles and reset | `apps/web/src/app/reset.css` |
| Font loading and initial preference application | `apps/web/src/app/layout.tsx`, `apps/web/src/app/editorial-fonts.ts` |
| Homepage and Playground composition | `apps/web/src/app/home.module.css`, `apps/web/src/app/page.tsx`, `apps/web/src/app/playground/page.tsx` |
| Blog index composition | `apps/web/src/app/blog/index.module.css` |
| Blog article layout, type scale, media, and prose | `apps/web/src/app/blog/blog.module.css` |
| Tailwind imports, sources, and editorial font utilities | `apps/web/src/app/globals.css` |
| Shared UI semantic utilities and opt-in theme values | `packages/ui/src/styles/theme.css`, `packages/ui/src/styles/defaults.css` |
| Unstyled primitives | `packages/ui/src/index.ts` |
| Styled shared components and consumer setup | `packages/ui/src/components`, `packages/ui/README.md` |
| Shared UI and editorial palette references | `packages/ui/src/stories/SharedUI.stories.tsx`, `PageChrome.stories.tsx`, `Editorial.stories.tsx` |

CSS Module classes are local to their module. The blog's custom properties are
scoped to its `.page`; do not assume they are globally available.

The system has two visual families: editorial pages and application controls.
Share tokens and components where their roles match. Keep route composition,
content, and experiment-specific art direction in the app. CSS Modules and
Tailwind utilities may consume the same tokens; a CSS Module does not need to
be rewritten in utilities to participate in the system.

## Color

| Role | Existing token | Reference value |
| --- | --- | --- |
| Page background | `--color-paper` | `#f8f5ee` |
| Primary text | `--color-ink` | `#211f1b` |
| Secondary editorial text | `--color-editorial-muted` | `#6f6a61` |
| Text selection | `--color-selection` | `#e8d8bd` |
| Blog separators | `--blog-rule` | `#d9d2c5` |
| Blog accent and focus | `--blog-accent` | `#8b3a2a` |

Use ink for primary content and muted text for supporting metadata. Use the blog
accent sparingly for interaction and emphasis. The homepage divider mixes ink at
18% opacity; social-link hover backgrounds mix the current color at 8%.

`editorial.css` emits its four tokens with `@theme static` so CSS Modules can
always read them, even when no matching utility appears in markup. Utilities
include `bg-paper`, `text-ink`, `text-editorial-muted`, and `selection:bg-selection`.
Blog paper and text roles alias these tokens; its rule and accent remain local.

Application controls use a separate neutral palette from `defaults.css`, enabled
by `data-ui-theme="light"`, `"dark"`, or `"system"`. The mode is mirrored to
`body` for portals; use one mode per document, not nested or simultaneous modes.
The shared `--color-muted` / `bg-muted` role is a surface; use
`text-muted-foreground` for application supporting text. Editorial supporting
text uses `text-editorial-muted`. The editorial palette stays light in every UI
mode and does not replace the application control tokens.

## Typography

Use the font-role variables so persisted font choices keep working:

| Role | Variable | Default |
| --- | --- | --- |
| Display headings | `--font-editorial-display` | Tenderness |
| Reading text | `--font-editorial-reading` | Newsreader |
| Navigation, controls, metadata | `--font-ui` | System sans-serif |
| Code | `--font-code` | System monospace |

Fonts are loaded in the root layout. Preserve the preference initialization before
interactive rendering and the display tracking-adjustment variables. Do not add
another font loader or hard-code a font that bypasses these roles.

Reference scales:

- Base homepage/Playground title: `clamp(3rem, 8vw, 6rem)`, line-height `0.94`,
  maximum `12ch`. The homepage masthead removes that measure and, from `72rem`,
  uses `clamp(6rem, 9vw, 8rem)`.
- Base homepage/Playground prose: `clamp(1.2rem, 1rem + 0.7vw, 1.6rem)`,
  line-height `1.35`, maximum `36ch`. Homepage role status is `1.2rem` ink;
  project description is `1.125rem` with line-height `1.5`.
- Homepage section headings: italic display face,
  `clamp(1.75rem, 4vw, 2.25rem)`, line-height `1.1`, weight `450`.
  Speaking uses `1.75rem` from `72rem`.
- Past-work names: `1.25rem` system sans, weight `550`; roles: `0.875rem`;
  dates: `0.8125rem`. Roles and dates use line-height `1.5`.
- Homepage feature metadata: `0.75rem` system sans, `0.08em` tracking,
  uppercase. This differs from experiment `Eyebrow` (monospace, `0.72rem`,
  `0.12em` tracking) and blog metadata; do not substitute them unchanged.
- Blog article title: `clamp(3.25rem, 2rem + 5vw, 6.75rem)`, line-height `1`,
  maximum `17ch`, with a smaller mobile override.
- Blog body: `clamp(1.1875rem, 1.15rem + 0.2vw, 1.25rem)`, line-height `1.6`,
  maximum `60ch`.
- Blog captions: `0.875rem`; compact metadata: `0.78rem` system sans.

Balance display headings and use pretty wrapping for prose where supported.
Reserve uppercase and tracking for short blog metadata labels. Keep long text in
sentence case. When asked for darker text, adjust color without changing weight.

## Layout and spacing

The base page used by Playground has a `48rem` maximum width and
`clamp(1.5rem, 4vw, 3rem)` padding. The homepage overrides its width to `80rem`
and uses a shared grid: one column below `48rem`, three from `48rem`, then four
including an `8rem` section-label column from `72rem`. Sections and work entries
align through subgrid. Homepage navigation changes from a vertical list to the
masthead grid at `48rem`; Playground retains the vertical list.

Speaking and Past work begin after a thin rule, `3rem` top margin, and `1.5rem`
top padding. Work entries have `1.25rem` block padding and subtle separators;
the first entry loses top padding from `72rem`. The project detail uses its own
two-column grid from `48rem` and preserves the screenshot's aspect ratio at up
to `18.75rem` wide. Keep these composition rules local to the homepage.

The blog index uses a `68rem` shell with a compact masthead and one chronological
reading list, capped at `42rem`. A named inline-size container places the
introduction beside the list from `56rem`; narrower layouts stack it above.
Each entry flows naturally as title, summary, then date, with consistent title
sizing and subtle separators. The index omits decorative numbering and tags;
there is no special lead treatment. Keep these styles in `index.module.css`.

Blog articles use a centered outer width of `72rem` and a `60ch` reading column.
Article titles, media marked `data-mdx-media`, and interactive content marked
`data-mdx-interactive` can span the wide grid. At `42rem` and below, the article
reading grid becomes a single column.

Reuse the blog's existing spacing steps when extending that surface:
`0.25`, `0.5`, `0.75`, `1`, `1.5`, `2`, `2.5`, `3`, `4`, `5`, `6`, and `8rem`.
Use small gaps within a related group and larger gaps between sections.

Keep prose narrow enough to read, while allowing diagrams and interactive content
to use the available space. Contain overflow inside code blocks or wide data
regions; avoid horizontal scrolling of the whole page.

## Components and interaction

- Use text links for navigation and buttons for actions. Homepage destination
  links use short labels with muted underlines that darken on hover or focus;
  return links use a leading arrow.
- Keep social icons visually small, with accessible names and at least `44px`
  square targets. Hide decorative SVGs from assistive technology.
- Preserve visible keyboard focus. Existing editorial links use a `3px` outline
  with a `4px` offset, colored with ink or the blog accent.
- Prefer lists and rules for editorial indexes and work history. Use containers,
  borders, and backgrounds when they communicate grouping or interaction.
- Root `@personal-site/ui` exports unstyled Base UI primitives. Import styled
  controls from `@personal-site/ui/components/*` and `cn` from
  `@personal-site/ui/lib/utils`. The styled layer provides buttons, fields,
  popups, and other shared controls; app-specific compositions remain local.
- Use Tailwind Variants (`tv`) for genuine variants. Group long utility lists by concern in `cn()`
  without changing class order, and keep caller `className` last. Follow the
  repository's Biome setup.
- `Eyebrow` and `PageNavigation` supply structural experiment defaults; page
  colors, spacing, focus treatment, and headings remain with the consumer.
- Tailwind scans `packages/ui/src` through the app's stylesheet. Write complete
  class strings, and use Base UI state attributes for hover-independent states
  such as disabled, checked, highlighted, and open.
- Follow the UI README's portal isolation and backdrop guidance when adding
  popups. Verify focus, dismissal, and keyboard behavior in the consuming app.
- Use Storybook's `Shared UI/Theme` for application states, `Shared UI/Page chrome`
  for structural components, and `Editorial/Palette` for the shared colors,
  including their independence from dark UI mode. The palette story uses system
  sans; check actual Tenderness/Newsreader typography and persisted font choices
  in the web app. Generated starter examples are not brand references.

Editorial pages should remain readable without animation. For new motion, use it
to explain state changes, respect reduced-motion preferences, and provide a way
to pause persistent animated experiments where appropriate.

## Copy and information architecture

Use concrete, brief labels and factual descriptions. Preserve supplied names,
dates, roles, and exact copy. Do not invent career claims, impact numbers, project
outcomes, or testimonials.

Keep the homepage's small set of destinations. Put experiment links under
Playground. The analyst link and font switcher are currently development-only;
preserve those visibility boundaries unless explicitly asked to change them.

Do not reintroduce a removed tagline, CTA, or description as part of an unrelated
design task. New supporting copy should help the reader understand the content or
complete an action.

## Patterns to avoid

- Replacing the editorial font roles with a generic sans-serif hero.
- Converting plain work-history rows or article lists into a grid of rounded cards.
- Adding gradients, glows, glass panels, or decorative badges to ordinary editorial
  pages without a content-specific reason. Existing canvas experiments have their
  own art direction.
- Increasing font weight when the requested change is contrast or color.
- Forcing the chat theme, a Storybook starter style, or one experiment's palette
  onto the rest of the site.
- Adding broad navigation, marketing sections, or placeholder metrics to fill space.

## Review and evolve

For a visual change, compare the affected route with its existing implementation
at a narrow mobile width and a desktop width. Check heading wrapping, readable
measure, content order, keyboard focus, overflow, and the relevant interaction
states. Include persisted font preferences when typography changes. Report which
checks were actually performed; source inspection alone does not prove rendering.

To evaluate changes to this guide, start with fixed examples: a homepage work
entry, a blog article containing code and media, and an experiment with controls.
Keep content and viewports constant, save the first outputs, and review hierarchy,
legibility, and consistency. Include a chat surface to check that editorial rules
are not applied outside their scope. Record repeated accepted corrections here;
put reusable mechanics in the owning stylesheet or component.

Method reference: [Vercel's approach to design.md](https://vercel.com/blog/how-our-agents-build-on-brand-pages-with-design-md).
This guide applies that idea to this site's existing implementation; it does not
import Vercel's brand or claim their evaluation results.
