---
name: editorial
description: Design or refine magazine-inspired web interfaces with a clear reading hierarchy, elegant serif typography, structured grids, and accessible responsive behavior.
license: MIT
metadata:
  source: https://github.com/bergside/awesome-design-skills/tree/main/skills/editorial
---

# Editorial UI

Use this skill when designing or implementing public-facing pages that should feel like a considered publication: essays, case studies, reading experiences, archives, or studio work. Do not apply it to utilitarian product controls where density and task speed matter more than editorial character.

## Design direction

- Establish hierarchy before decoration: a strong headline, clear metadata, readable body measure, and deliberate supporting content.
- Use the project's existing design tokens, typefaces, and components first. If no established system applies, prefer a restrained dark ink / warm paper palette, an editorial serif for display and long-form reading, and a monospace or neutral sans for labels and metadata.
- Work from a disciplined grid and a consistent spacing rhythm. Let generous whitespace create emphasis; avoid ornamental borders, gradients, or type effects that dilute the content.
- Make pages responsive by reflowing the grid and preserving a comfortable line length. Do not solve small screens by merely shrinking desktop typography.

## Implementation expectations

- Keep states explicit where interaction exists: hover, focus-visible, active, disabled, loading, error, empty, and long-content/overflow states as relevant.
- Use semantic HTML before ARIA. Ensure keyboard access, visible focus treatment, reduced-motion support, 44px minimum touch targets where practical, and WCAG 2.2 AA contrast.
- Prefer semantic design tokens over raw values. If a new token or shared pattern is warranted, explain the constraint it captures and update the appropriate shared layer rather than creating a one-off value.
- Write concise, confident, low-jargon interface copy. Labels should state the action or destination plainly.

## Review checklist

- Is the reading and visual hierarchy clear without relying on decoration?
- Are typography, spacing, and color choices consistent with existing project conventions?
- Does the layout reflow intentionally at narrow widths, including long titles and empty states?
- Can every interactive element be used with a keyboard and identified by assistive technology?
- Are focus, contrast, and motion choices testable in the implementation?

## Source

Adapted for this repository from the [Editorial design skill](https://github.com/bergside/awesome-design-skills/blob/main/skills/editorial/SKILL.md) by typeui.sh, licensed MIT.
