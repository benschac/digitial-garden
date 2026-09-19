# Personal site design guide

Use this guide when building or changing Benjamin Schachter's personal site and
shared UI. Start with the reader's task, then reuse the relevant existing page's
composition and styles. Explicit task instructions take precedence over this guide.

This first version records the current source as of September 19, 2026. It has not
been validated through screenshot comparisons or generation evaluations. The
visual direction below is inferred from the implementation, not a separate brand
brief. Suggested review practices are guidance for future work.

## Identity and purpose

The site presents a software engineer's work, writing, and interactive experiments.
Its public editorial surfaces use warm paper, dark ink, expressive serif headings,
readable serif prose, and restrained system-sans navigation. Hierarchy comes from
type size, whitespace, and thin rules.

- Home: identify Benjamin, expose a few useful destinations, and show past work.
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
| Editorial colors, fonts, reset | `apps/web/src/app/reset.css` |
| Font loading and initial preference application | `apps/web/src/app/layout.tsx`, `apps/web/src/app/editorial-fonts.ts` |
| Homepage and Playground composition | `apps/web/src/app/home.module.css`, `apps/web/src/app/page.tsx`, `apps/web/src/app/playground/page.tsx` |
| Blog layout, type scale, media, and prose | `apps/web/src/app/blog/blog.module.css` |
| Tailwind sources and scoped chat theme | `apps/web/src/app/globals.css` |
| Shared primitives and consumer setup | `packages/ui/src/index.ts`, `packages/ui/README.md` |

CSS Module classes are local to their module. The blog's custom properties are
scoped to its `.page`; do not assume they are globally available.

## Color

| Role | Existing token | Reference value |
| --- | --- | --- |
| Page background | `--color-paper` | `#f8f5ee` |
| Primary text | `--color-ink` | `#211f1b` |
| Secondary editorial text | `--color-muted` in `reset.css` | `#6f6a61` |
| Text selection | `--color-selection` | `#e8d8bd` |
| Blog separators | `--blog-rule` | `#d9d2c5` |
| Blog accent and focus | `--blog-accent` | `#8b3a2a` |

Use ink for primary content and muted text for supporting metadata. Use the blog
accent sparingly for interaction and emphasis. The homepage divider mixes ink at
18% opacity; social-link hover backgrounds mix the current color at 8%.

Chat has a separate light/dark neutral palette scoped through `.chat-theme` and
`body:has(.chat-theme)`. Its Tailwind `--color-muted` mapping represents a surface,
while the editorial reset uses that name for text. Check scope and the computed
value before reusing it. Do not treat chat tokens as universal editorial tokens.
The editorial surfaces currently have no equivalent automatic dark palette.

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

- Homepage title: `clamp(3rem, 8vw, 6rem)`, line-height `0.94`, maximum `12ch`.
- Homepage introductory text: `clamp(1.2rem, 1rem + 0.7vw, 1.6rem)`, line-height
  `1.35`, maximum `36ch`.
- Past-work names: `1.125rem` system sans, weight `500`; roles and dates:
  `0.875rem`, line-height `1.5`.
- Blog article title: `clamp(3.25rem, 2rem + 5vw, 6.75rem)`, line-height `1`,
  maximum `17ch`, with a smaller mobile override.
- Blog body: `clamp(1.1875rem, 1.15rem + 0.2vw, 1.25rem)`, line-height `1.6`,
  maximum `60ch`.
- Blog captions: `0.875rem`; compact metadata: `0.78rem` system sans.

Balance display headings and use pretty wrapping for prose where supported.
Reserve uppercase and tracking for short blog metadata labels. Keep long text in
sentence case. When asked for darker text, adjust color without changing weight.

## Layout and spacing

The homepage and Playground share a left-aligned page with a `48rem` maximum width
and `clamp(1.5rem, 4vw, 3rem)` padding. Navigation is a vertical list with `0.75rem`
gaps. Past work begins after a thin rule, `3rem` top margin, and `1.5rem` top
padding; entries are separated by `2rem`.

The blog uses a centered outer width of `72rem` and a `60ch` reading column.
Article titles, media marked `data-mdx-media`, and interactive content marked
`data-mdx-interactive` can span the wide grid. At `42rem` and below, the blog
masthead and listing become single-column layouts.

Reuse the blog's existing spacing steps when extending that surface:
`0.25`, `0.5`, `0.75`, `1`, `1.5`, `2`, `2.5`, `3`, `4`, `5`, `6`, and `8rem`.
Use small gaps within a related group and larger gaps between sections.

Keep prose narrow enough to read, while allowing diagrams and interactive content
to use the available space. Contain overflow inside code blocks or wide data
regions; avoid horizontal scrolling of the whole page.

## Components and interaction

- Use text links for navigation and buttons for actions. Homepage destination
  links use short labels with a trailing arrow; return links use a leading arrow.
- Keep social icons visually small, with accessible names and at least `44px`
  square targets. Hide decorative SVGs from assistive technology.
- Preserve visible keyboard focus. Existing editorial links use a `3px` outline
  with a `4px` offset, colored with ink or the blog accent.
- Prefer lists and rules for editorial indexes and work history. Use containers,
  borders, and backgrounds when they communicate grouping or interaction.
- Shared `@personal-site/ui` exports Base UI primitives. These are unstyled;
  importing them does not supply this site's visual treatment. Add reusable
  styling and compositions there when a real use case requires them.
- Tailwind scans `packages/ui/src` through the app's stylesheet. Write complete
  class strings, and use Base UI state attributes for hover-independent states
  such as disabled, checked, highlighted, and open.
- Follow the UI README's portal isolation and backdrop guidance when adding
  popups. Verify focus, dismissal, and keyboard behavior in the consuming app.
- Treat generated Storybook examples as demonstrations, not brand references.

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
