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
