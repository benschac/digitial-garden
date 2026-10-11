import { cn } from "@personal-site/ui/lib/utils";
import { typographyVariants } from "@/components/page-typography";

// Presentation shared by homepage sections; keep these page-specific rules local.
export const focusRing =
  "focus-visible:outline-[3px] focus-visible:outline-current focus-visible:outline-offset-4";
export const featureLink = cn(
  "inline-flex min-h-11 items-center",
  typographyVariants({ variant: "featureLink" }),
  "text-inherit underline decoration-[color-mix(in_srgb,currentColor_40%,transparent)] decoration-1 underline-offset-[0.25em]",
  "hover:decoration-current focus-visible:decoration-current",
  focusRing,
);

// Superior Serif carries real small-cap glyphs; Newsreader and Fraunces would synthesize them.
export const sectionLabel = cn(
  "font-[family-name:var(--font-superior-serif)] text-[1.375rem] font-medium not-italic leading-[1.2]",
  "tracking-[0.08em] [font-variant-caps:all-small-caps]",
);
export const itemHeading =
  "text-balance font-[family-name:var(--home-entry-font,var(--font-newsreader))] [font-optical-sizing:auto]";
// Libre Caslon Condensed carries true old-style figures, and its width keeps margin dates short.
export const dateText = cn(
  "font-[family-name:var(--font-libre-caslon-condensed)] text-[0.9375rem]",
  "oldstyle-nums proportional-nums md:proportional-nums",
);
