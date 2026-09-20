# Repository conventions

## Tailwind class readability

- Split long Tailwind class lists into multiple string arguments to `cn()`, grouped by concern such as layout, appearance, typography, and interaction states.
- Keep short class lists on one line. When regrouping existing classes, preserve every class and its order so class merging behavior stays unchanged.
- Keep the caller's `className` as the last argument so overrides continue to work.
- Use Tailwind Variants (`tv`) when a component needs variants; do not introduce it solely to wrap a long class list.
- Use the existing Biome formatter. Do not add a formatter dependency or enable experimental class-sorting rules solely for readability.
