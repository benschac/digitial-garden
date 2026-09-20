import {
  type TypographyProps as SharedTypographyProps,
  typographyVariants as sharedTypographyVariants,
} from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import { createElement } from "react";

// Shared values within app typography; complete utility strings preserve cn() overrides.
const experimentIntroSize = "text-[clamp(1.2rem,_2vw,_1.55rem)]";
const experimentHeadingSize = "text-[clamp(2rem,_4vw,_3.5rem)]";
const experimentDisplayTracking =
  "tracking-[calc(_-0.06em_+_var(--font-editorial-display-tracking-adjustment)_)]";
const editorialHeadingTracking =
  "tracking-[calc(_-0.035em_+_var(--font-editorial-display-tracking-adjustment)_)]";

// Page-specific visual roles belong to the app, not the reusable UI package.
const pageTypography = {
  featureLink: "text-sm leading-normal",
  screenshotCaption: "text-[0.8125rem]",
  previewLabel: "text-[0.68rem] font-[650] tracking-[0.085em] uppercase",
  playgroundTitle: cn(
    "font-display text-[clamp(3rem,8vw,6rem)] font-[450] leading-[1.15]",
    "tracking-[calc(-0.045em+var(--font-editorial-display-tracking-adjustment))]",
    "text-balance [font-optical-sizing:auto]",
  ),
  playgroundLead: cn(
    "font-reading text-[clamp(1.2rem,1rem+0.7vw,1.6rem)] leading-[1.35]",
    "text-pretty [font-optical-sizing:auto]",
  ),
  experimentVectorIntro: cn(
    "font-reading",
    experimentIntroSize,
    "leading-[1.45]",
  ),

  experimentVectorActiveMethodDescription: "text-[0.8rem]",

  experimentVectorWarning: "font-sans text-[1rem] leading-[1.4]",

  experimentNoiseIntro: cn(
    "font-reading",
    experimentIntroSize,
    "[font-optical-sizing:auto] leading-[1.45] text-pretty",
  ),

  experimentNoiseMetricLabel:
    "font-mono text-[0.65rem] tracking-[0.07em] uppercase",
  experimentNoiseMetricValue: "font-mono text-[1rem] font-[500]",

  experimentNoiseThreeLegend:
    "font-mono text-[0.68rem] tracking-[0.1em] uppercase",

  experimentNoiseThreeLoading:
    "font-mono text-[0.72rem] tracking-[0.1em] uppercase",
  experimentForcesIntro: cn(
    "font-reading",
    experimentIntroSize,
    "leading-[1.5]",
  ),
  experimentForcesStatus: "font-mono text-[0.7rem] tracking-[0.08em] uppercase",

  experimentForcesTelemetry:
    "font-mono text-[0.68rem] tracking-[0.07em] uppercase",

  experimentForcesPrimaryButton: cn(
    "[font-family:inherit] [font-weight:inherit] [font-style:inherit] [font-variant:inherit]",
    "[font-stretch:inherit] [line-height:inherit] text-[0.8rem]",
  ),

  experimentForcesEquation:
    "text-[clamp(0.9rem,_1.25vw,_1.05rem)] tabular-nums",
  experimentForcesNotes: "text-[0.82rem] leading-[1.6]",
  experimentParticlePage: "[font-family:Arial,_Helvetica,_sans-serif]",
  experimentParticleNav:
    "[font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace] text-[0.75rem] tracking-[0.08em]",
  experimentParticleEyebrow:
    "[font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace] text-[0.74rem]",
  experimentParticleIntro: "text-[clamp(1rem,_2vw,_1.3rem)] leading-[1.65]",
  experimentParticleTelemetry:
    "[font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace] text-[0.7rem] tracking-[0.08em] uppercase",

  experimentDisplay: cn(
    "font-display text-[clamp(3.7rem,_9vw,_8rem)] font-[430]",
    experimentDisplayTracking,
    "leading-[0.88]",
    "text-balance",
  ),
  experimentNoiseDisplay: cn(
    "font-display text-[clamp(3.6rem,_9vw,_8rem)] [font-optical-sizing:auto] font-[430]",
    experimentDisplayTracking,
    "leading-[0.88]",
    "text-balance",
    "[@media(max-width:680px)]:text-[clamp(3.4rem,_18vw,_5.2rem)]",
  ),
  experimentParticleDisplay:
    "text-[clamp(3rem,_8vw,_7rem)] font-[500] tracking-[-0.065em] leading-[0.92]",
  experimentHeading: cn(
    "font-display",
    experimentHeadingSize,
    "font-[450]",
    editorialHeadingTracking,
    "leading-[1]",
  ),
  experimentForcesHeading: cn(
    "font-display",
    experimentHeadingSize,
    "font-[450] tracking-[-0.035em] leading-[1]",
  ),
  experimentNoiseHeading: cn(
    "font-display",
    experimentHeadingSize,
    "[font-optical-sizing:auto] font-[450]",
    editorialHeadingTracking,
    "leading-[1]",
  ),
  experimentForcesSectionHeading:
    "font-display text-[clamp(2.6rem,_5vw,_4.75rem)] font-[450] tracking-[-0.04em] leading-[0.95]",
  experimentPage: "font-sans",
  experimentKicker: "font-mono text-[0.72rem] tracking-[0.12em] uppercase",
  experimentStatus: "font-mono text-[0.72rem] tracking-[0.08em] uppercase",
  experimentNotes: "text-[0.88rem] leading-[1.6]",

  journalReading: "font-reading [font-optical-sizing:auto]",
  journalTitle: cn(
    "font-display text-[clamp(3rem,_2rem_+_3cqi,_4.5rem)] font-[400] leading-[1]",
    "tracking-[calc(_-0.04em_+_var(--font-editorial-display-tracking-adjustment)_)]",
  ),
  journalDate: "font-sans text-[0.8125rem] tabular-nums",
  journalPostTitle: cn(
    "font-display text-[clamp(1.5rem,_1.25rem_+_0.7cqi,_1.875rem)] font-[450] leading-[1.22]",
    "tracking-[calc(_-0.015em_+_var(--font-editorial-display-tracking-adjustment)_+_var(--font-editorial-display-secondary-tracking-adjustment)_)]",
    "text-balance",
    "[overflow-wrap:anywhere]",
  ),
  journalSummary:
    "text-[1.125rem] leading-[1.65] text-pretty [overflow-wrap:anywhere]",
  articleReading:
    "font-reading [font-optical-sizing:auto] ui-article-typography",
  articleBackLink:
    "font-sans text-[2rem] font-[650] tracking-[0] leading-[1] uppercase",
  articleDeck:
    "text-[length:var(--blog-text-deck)] leading-[var(--blog-leading-deck)] text-pretty",
  articleTitle: cn(
    "font-display text-[clamp(3.25rem,2rem_+_5vw,6.75rem)] font-[450]",
    "tracking-[calc(-0.047em_+_var(--font-editorial-display-tracking-adjustment))]",
    "leading-[1]",
    "text-balance",
    "[@media(max-width:42rem)]:text-[clamp(2.85rem,14vw,4.5rem)]",
    "[@media(max-width:42rem)]:tracking-[calc(-0.04em_+_var(--font-editorial-display-tracking-adjustment))]",
  ),
  articleMetadata:
    "font-sans text-[length:var(--blog-text-meta)] tabular-nums tracking-[0.04em] leading-[1.55]",
  articleProse:
    "text-[length:var(--blog-text-body)] font-[400] leading-[var(--blog-leading-body)] ui-article-prose",
  articleNavigationTitle:
    "font-display text-[clamp(1.25rem,_2.2vw,_1.7rem)] leading-[1.15]",
  articleNavigationLabel:
    "font-sans text-[0.65rem] font-[650] tracking-[0.085em] uppercase",
  studyInterface: "font-sans",
  studyTitle: "text-[1.5rem] font-[600] tracking-[-0.025em]",
  studyDescription: "text-[0.875rem] leading-[1.6]",
  studyNavigation: "text-[0.875rem]",
  studyOptionTitle: "text-[1rem] leading-[1.4]",
  studyMasthead: "text-[0.8125rem]",
  studySiteLink: "font-[600]",
  studyBlogTitle: cn(
    "font-display font-[400] text-[3rem]",
    editorialHeadingTracking,
    "leading-[1.1]",
  ),
  studyIntroduction: "text-[1rem] leading-[1.6] text-pretty",
  studyDate: "text-[0.8125rem] leading-[1.5] tabular-nums",
  studyPostTitle: cn(
    "font-reading text-[clamp(1.6rem,_1.4rem_+_0.65cqi,_2rem)] font-[550]",
    "tracking-[-0.015em]",
    "leading-[1.25]",
    "text-pretty",
    "[overflow-wrap:anywhere]",
  ),
  studySummary:
    "text-[1rem] leading-[1.7] text-pretty [overflow-wrap:anywhere]",
  studyYear: "font-mono text-[0.875rem] font-[500]",
  studyArchiveTitle: "text-[1rem] font-[500] leading-[1.55]",
  studyFeaturedTitle: cn(
    "font-sans text-[1.25rem] font-[600] leading-[1.4]",
    "tracking-[-0.015em] text-pretty",
    "[overflow-wrap:anywhere] text-[clamp(1.85rem,_1.5rem_+_1.5cqi,_2.8rem)]",
  ),
  studyCardTitle:
    "font-sans text-[1.25rem] font-[600] leading-[1.4] tracking-[-0.015em] text-pretty [overflow-wrap:anywhere]",
} as const;

type SharedVariant = NonNullable<
  Parameters<typeof sharedTypographyVariants>[0]
>["variant"];
type PageVariant = keyof typeof pageTypography;

function isPageVariant(variant: string): variant is PageVariant {
  return Object.hasOwn(pageTypography, variant);
}

export function typographyVariants({
  variant,
  className,
}: {
  variant?: PageVariant | SharedVariant;
  className?: string;
} = {}) {
  return cn(
    variant && isPageVariant(variant)
      ? pageTypography[variant]
      : sharedTypographyVariants({ variant: variant as SharedVariant }),
    className,
  );
}

export type TypographyProps<T extends keyof HTMLElementTagNameMap = "span"> =
  Omit<SharedTypographyProps<T>, "variant"> & {
    variant?: PageVariant | SharedVariant;
  };

export function Typography<
  const T extends keyof HTMLElementTagNameMap = "span",
>({ as, variant, className, ...props }: TypographyProps<T>) {
  return createElement(as ?? "span", {
    ...props,
    className: typographyVariants({ variant, className }) || undefined,
  });
}

/** Canvas APIs accept CSS font shorthands rather than DOM components. */
export const canvasTypography = {
  forceLabel: "600 12px ui-monospace, monospace",
  forceReadout: "600 11px ui-monospace, monospace",
  forceEquation: "500 15px ui-monospace, monospace",
} as const;
