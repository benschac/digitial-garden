# Article typography inspector

In development or production, open a blog article and choose the circular **Aa** typography button at the bottom right (accessible name: **Typography**). The inspector starts with native heading trim, matching the published editorial default. The blog title and authored h2–h4 use `text-box-trim: trim-both` and `text-box-edge: cap alphabetic` where both are supported; older browsers retain untrimmed CSS. Paragraphs and embedded components keep their own boxes. Choosing Trim off or Capsize previews an alternative, including an optional headings-and-paragraphs scope. **Close typography** hides the controls while keeping the inspector mounted, so spacing, trim, selected block and overlay choices remain active. **Show typography** reopens the same controls. **Reset preview** in the panel toolbar clears article spacing/trim overrides and removes overlays while keeping the panel open; saved font preferences remain selected. Leaving the article also tears down its preview. Preview state is retained on close, but is not stored across a page reload.

The rounded panel is 360px wide where space allows, with a scrolling controls area capped at 480px and a fixed toolbar. Smaller viewports reduce its available width and height. The toolbar's **Animate** switch (accessible name: **Panel animation**) enables or disables the 260ms Motion pointer-open/close fade and subtle scale. The panel remains visible until its exit finishes. The setting survives closing and reopening the panel on the current route. Reduced motion keeps the fade without scaling. Keyboard opening, closing and Escape are instant. Escape also returns focus to the circular launcher. Measured overlays never animate.

Inspector selects retain native keyboard and option behavior, with a consistent 44px minimum height, 12px corners and an inset decorative chevron. Their app-owned radius does not depend on the opt-in shared UI theme.

On any blog article, **Ctrl/⌘ + Shift + U** toggles content overlays and spacing guides together, even before opening the panel. If either is off, the shortcut turns both on; if both are on, it turns both off. The first use keeps the controls minimized so the article stays visible. The checkboxes stay in sync with the shortcut. Typing in inputs, selects, textareas or editable content, composing text, and holding the shortcut do not toggle overlays. Reset preview and route changes clear the overlays. Chat routes keep the typography control hidden.

Font sources are resolved from the computed primary family, CSS font-face rules, style and CSS weight matching. Metrics come from the exact compiled Next font asset with `@capsizecss/unpack/fs`. This covers custom OTF/WOFF/WOFF2 files and self-hosted Google fonts. LT Superior Serif and Bonbance are the repository defaults; the existing font preference can choose different fonts. System fonts cannot be verified through this API, so they retain original CSS; Georgia's Capsize catalog entry is explicitly a reference. Missing metrics never trigger fallback trimming.

In development, the metrics API reads `.next/dev/static/media`. Requests accept only a bare font filename; URLs, absolute paths, traversal and symlinks outside that directory are rejected. The API continues to return 404 in production. After production compilation, `scripts/prepare-typography-metrics.mjs` extracts metrics into `.next/static/typography-metrics/<font-asset>.json`. The inspector loads these static files beside the compiled fonts, so serverless deployments do not need runtime filesystem access to font assets. Build extraction failures fail the build. A production build and local production-server check are separate from deploying the change to the hosted site.

Capsize's `precomputeValues` preserves the computed font size and line height and supplies pseudo-element edge margins. Trim off and Capsize explicitly suppress published native trim so comparisons never stack both methods. `getCapHeight` supplies the cap-height measurement. Native comparison uses `text-box-trim: trim-both` and `text-box-edge: cap alphabetic`, only when both are supported. Existing pseudo content and embedded component interiors are excluded from trim selection.

**Show all content overlays** adds reading-column rails, labeled DOM boxes for all visible article content (including nested lists/tables, code, notes and embedded figures), and optional font guides across HTML text. Scroll and resize refresh the overlays; clipped table content stays clipped. Dynamically loaded figure content refreshes the diagnostic boxes, including labels and shapes inside open shadow roots such as Giotto. SVG text is boxed, while font guides require a verified HTML font. Embedded component styles are never changed by these overlays. Only visible blocks are measured and clone line measurements are cached between scrolls.

For one block, use **Show guides for selected text**. Gold is the DOM box; red is its baseline, blue the font-wide cap height, green the x-height, purple ascent and orange descent. DOM Ranges locate wrapped lines, and zero-height inline probes in an offscreen clone measure their baselines without modifying React-owned text. These lines are **not rendered glyph ink bounds**. Descenders, accents, inline code, alternate faces and variable-font outlines can extend beyond or differ from the primary face's metrics. Compare the typography visually as well as numerically. The mode table measures clone heights at the current width.

**Vertical rhythm** exposes the Spacing preset selector directly. Fine-tune spacing and overlays contains optional heading leading, body/deck leading and outer block margin sliders. All start at 1× existing CSS. Only an explicit slider adjustment changes leading. Gap guides measure DOM block edges across the header and authored content, including lists, tables, code and figures. An optional nested-spacing view includes component interiors without changing their styles. Zero gaps (such as adjacent table rows) are shown; horizontally separated grid cells are not treated as vertical gaps.

The **Spacing preset** selector previews Editorial · recommended, Editorial compact, Editorial airy, Golden ratio · 1.618, 4px spacing grid, 8px spacing grid, and Fluid spacing · responsive, all using the selected trim mode. Editorial is the current blog design and the recommended starting point for long posts, with body leading at 1.55. Editorial compact uses 1.50 and 20% smaller outer gaps; Editorial airy uses 1.65 and 20% larger gaps. **Compare spacing presets** explains line spacing versus block spacing and shows a comparison table so each choice is understandable before selection. Presets preserve heading line height.

Golden ratio sets body leading to 1.618 and positive outer spacing from body-size multiples 1, 1.618 and 2.618 (heading-to-text space is body size / 1.618). It preserves zero margins and embedded internals. The ratio is an experiment, not a quality score or a requirement for every gap. Slider adjustments switch to Custom while retaining the active spacing scale, so any spacing system can be fine-tuned without reverting to editorial gaps.

The 4px and 8px grid presets use distinct spacing recipes instead of rounding existing gaps, which can produce identical results when gaps already fit both grids. Both retain body leading at 1.55 and preserve zero margins. They organize gaps, not every text baseline.

| Owned outer spacing     | 4px grid    | 8px grid    |
| ----------------------- | ----------- | ----------- |
| Paragraphs              | 20px        | 24px        |
| Grouped content / title | 32px        | 40px        |
| h2 before / after       | 48px / 16px | 64px / 24px |
| h3 before / after       | 32px / 12px | 40px / 16px |
| h4 before / after       | 24px / 8px  | 32px / 16px |

The fine-tune multiplier applies to these recipes, so Custom values may intentionally leave the grid. Fluid retains body leading at 1.55, with paragraph gaps growing from 18px at 360px to 28px at 1440px, clamped beyond those widths. Group gaps are 1.5 times the base, h2 section gaps 2.5 times, and heading-to-text gaps 0.75 times for h2 or 0.5 times for h3/h4. All scales preserve zero margins and embedded component interiors. Grid steps follow common [Carbon spacing conventions](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview); Fluid is a project-specific experiment inspired by [Utopia's fluid space system](https://utopia.fyi/space/calculator/).

Closing the main panel preserves the active preview and shows the circular **Show typography** launcher. **Reset preview** lives inside the panel toolbar. Reset clears all article preview overrides while keeping published native heading trim. **Reset to editorial default** inside the panel only resets rhythm sliders and spacing, preserving the selected trim comparison. No preview styles leak into another route when the article inspector unmounts.

Both trim and rhythm CSS can be exported. Exports are font/viewport snapshots with deliberate classes to add to the relevant owned elements. Adapt snapshots to the article's responsive tokens before adopting them. Trimming first/last line edges does not change baseline-to-baseline spacing inside a multiline heading. Evaluate those two decisions separately.

## Motion audit

The `improve-animations` and `find-animation-opportunities` audit keeps diagnostic measurements and typography comparisons instant. `packages/ui/src/components/typography.tsx` owns static visual roles; motion belongs to the interactive consumer. The panel already stays outside page view-transition animations. Its optional surface animation is controlled independently by **Panel animation**.

| Candidate | Gate decision |
| --- | --- |
| Keyboard overlay toggle | Keep instant: keyboard actions must not wait on animation. |
| Content boxes, baselines and gap guides | Keep instant: interpolated coordinates would misrepresent the measured layout. |
| Font, trim and spacing comparisons | Keep instant: users need to compare the final typography and exact gaps. |
| Panel surface | Optional pointer transition: 260ms Motion opacity and scale from 0.97, using the existing page easing; reduced motion keeps only the fade. |
| Native disclosures | Keep stable: dense diagnostic content needs no decorative reveal. |

The animation switch changes only the panel surface. It does not interpolate font size, line height, margins, trim, content boxes or spacing guides.
