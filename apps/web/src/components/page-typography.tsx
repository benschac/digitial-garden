import { typographyVariants as sharedTypographyVariants } from "@personal-site/ui/components/typography";
import type { TypographyProps as SharedTypographyProps } from "@personal-site/ui/components/typography";
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
  articleBackLink:
    "font-sans text-[0.875rem] font-[500] tracking-[0] leading-[1.5]",
  articleDeck: cn(
    "font-reading [font-optical-sizing:auto]",
    "text-[length:var(--blog-text-deck)] leading-[var(--blog-leading-deck)] text-pretty"
  ),
  articleMetadata:
    "font-sans text-[length:var(--blog-text-meta)] tabular-nums tracking-[0.04em] leading-[1.55]",
  articleNavigationLabel:
    "font-sans text-[0.65rem] font-[650] tracking-[0.085em] uppercase",
  articleNavigationTitle:
    "font-display text-[clamp(1.25rem,_2.2vw,_1.7rem)] leading-[1.15]",
  articleProse: cn(
    "font-reading [font-optical-sizing:auto]",
    "text-[length:var(--blog-text-body)] font-[400] leading-[var(--blog-leading-body)] ui-article-prose"
  ),
  articleTitle: cn(
    "font-display text-[length:var(--blog-text-title)] font-[450]",
    "tracking-[calc(-0.047em_+_var(--font-editorial-display-tracking-adjustment))]",
    "leading-[1]",
    "text-balance",
    "[@media(max-width:42rem)]:tracking-[calc(-0.04em_+_var(--font-editorial-display-tracking-adjustment))]"
  ),
  experimentDisplay: cn(
    "font-display text-[clamp(3.7rem,_9vw,_8rem)] font-[430]",
    experimentDisplayTracking,
    "leading-[0.88]",
    "text-balance"
  ),
  experimentForcesEquation:
    "text-[clamp(0.9rem,_1.25vw,_1.05rem)] tabular-nums",
  experimentForcesHeading: cn(
    "font-display",
    experimentHeadingSize,
    "font-[450] tracking-[-0.035em] leading-[1]"
  ),
  experimentForcesIntro: cn(
    "font-reading",
    experimentIntroSize,
    "leading-[1.5]"
  ),
  experimentForcesNotes: "text-[0.82rem] leading-[1.6]",
  experimentForcesPrimaryButton: cn(
    "[font-family:inherit] [font-weight:inherit] [font-style:inherit] [font-variant:inherit]",
    "[font-stretch:inherit] [line-height:inherit] text-[0.8rem]"
  ),
  experimentForcesSectionHeading:
    "font-display text-[clamp(2.6rem,_5vw,_4.75rem)] font-[450] tracking-[-0.04em] leading-[0.95]",
  experimentForcesStatus: "font-mono text-[0.7rem] tracking-[0.08em] uppercase",
  experimentForcesTelemetry:
    "font-mono text-[0.68rem] tracking-[0.07em] uppercase",
  experimentHeading: cn(
    "font-display",
    experimentHeadingSize,
    "font-[450]",
    editorialHeadingTracking,
    "leading-[1]"
  ),
  experimentKicker: "font-mono text-[0.72rem] tracking-[0.12em] uppercase",
  experimentNoiseDisplay: cn(
    "font-display text-[clamp(3.6rem,_9vw,_8rem)] [font-optical-sizing:auto] font-[430]",
    experimentDisplayTracking,
    "leading-[0.88]",
    "text-balance",
    "[@media(max-width:680px)]:text-[clamp(3.4rem,_18vw,_5.2rem)]"
  ),
  experimentNoiseHeading: cn(
    "font-display",
    experimentHeadingSize,
    "[font-optical-sizing:auto] font-[450]",
    editorialHeadingTracking,
    "leading-[1]"
  ),
  experimentNoiseIntro: cn(
    "font-reading",
    experimentIntroSize,
    "[font-optical-sizing:auto] leading-[1.45] text-pretty"
  ),
  experimentNoiseMetricLabel:
    "font-mono text-[0.65rem] tracking-[0.07em] uppercase",
  experimentNoiseMetricValue: "font-mono text-[1rem] font-[500]",
  experimentNoiseThreeLegend:
    "font-mono text-[0.68rem] tracking-[0.1em] uppercase",
  experimentNoiseThreeLoading:
    "font-mono text-[0.72rem] tracking-[0.1em] uppercase",
  experimentNotes: "text-[0.88rem] leading-[1.6]",
  experimentPage: "font-sans",
  experimentParticleDisplay:
    "text-[clamp(3rem,_8vw,_7rem)] font-[500] tracking-[-0.065em] leading-[0.92]",
  experimentParticleEyebrow:
    "[font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace] text-[0.74rem]",
  experimentParticleIntro: "text-[clamp(1rem,_2vw,_1.3rem)] leading-[1.65]",
  experimentParticleNav:
    "[font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace] text-[0.75rem] tracking-[0.08em]",
  experimentParticlePage: "[font-family:Arial,_Helvetica,_sans-serif]",
  experimentParticleTelemetry:
    "[font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace] text-[0.7rem] tracking-[0.08em] uppercase",
  experimentStatus: "font-mono text-[0.72rem] tracking-[0.08em] uppercase",
  experimentVectorActiveMethodDescription: "text-[0.8rem]",
  experimentVectorIntro: cn(
    "font-reading",
    experimentIntroSize,
    "leading-[1.45]"
  ),
  experimentVectorWarning: "font-sans text-[1rem] leading-[1.4]",
  featureLink: "text-sm leading-normal",
  journalDate: "font-sans text-[0.8125rem] tabular-nums",
  journalPostTitle: cn(
    "font-display text-[clamp(1.5rem,_1.25rem_+_0.7cqi,_1.875rem)] font-[450] leading-[1.22]",
    "tracking-[calc(_-0.015em_+_var(--font-editorial-display-tracking-adjustment)_+_var(--font-editorial-display-secondary-tracking-adjustment)_)]",
    "text-balance",
    "[overflow-wrap:anywhere]"
  ),
  journalSummary: cn(
    "font-reading [font-optical-sizing:auto]",
    "text-[1.125rem] leading-[1.65] text-pretty [overflow-wrap:anywhere]"
  ),
  journalTitle: cn(
    "font-display text-[clamp(3rem,_2rem_+_3cqi,_4.5rem)] font-[400] leading-[1]",
    "tracking-[calc(_-0.04em_+_var(--font-editorial-display-tracking-adjustment)_)]"
  ),
  playgroundLead: cn(
    "font-reading text-[clamp(1.2rem,1rem+0.7vw,1.6rem)] leading-[1.35]",
    "text-pretty [font-optical-sizing:auto]"
  ),
  playgroundTitle: cn(
    "font-display text-[clamp(3rem,8vw,6rem)] font-[450] leading-[1.15]",
    "tracking-[calc(-0.045em+var(--font-editorial-display-tracking-adjustment))]",
    "text-balance [font-optical-sizing:auto]"
  ),
  previewLabel: "text-[0.68rem] font-[650] tracking-[0.085em] uppercase",
  screenshotCaption: "text-[0.8125rem]",
  studyArchiveTitle: "text-[1rem] font-[500] leading-[1.55]",
  studyBlogTitle: cn(
    "font-display font-[400] text-[3rem]",
    editorialHeadingTracking,
    "leading-[1.1]"
  ),
  studyCardTitle:
    "font-sans text-[1.25rem] font-[600] leading-[1.4] tracking-[-0.015em] text-pretty [overflow-wrap:anywhere]",
  studyDate: "text-[0.8125rem] leading-[1.5] tabular-nums",
  studyDescription: "text-[0.875rem] leading-[1.6]",
  studyFeaturedTitle: cn(
    "font-sans text-[1.25rem] font-[600] leading-[1.4]",
    "tracking-[-0.015em] text-pretty",
    "[overflow-wrap:anywhere] text-[clamp(1.85rem,_1.5rem_+_1.5cqi,_2.8rem)]"
  ),
  studyInterface: "font-sans",
  studyIntroduction: "text-[1rem] leading-[1.6] text-pretty",
  studyMasthead: "text-[0.8125rem]",
  studyNavigation: "text-[0.875rem]",
  studyOptionTitle: "text-[1rem] leading-[1.4]",
  studyPostTitle: cn(
    "font-reading text-[clamp(1.6rem,_1.4rem_+_0.65cqi,_2rem)] font-[550]",
    "tracking-[-0.015em]",
    "leading-[1.25]",
    "text-pretty",
    "[overflow-wrap:anywhere]"
  ),
  studySiteLink: "font-[600]",
  studySummary:
    "text-[1rem] leading-[1.7] text-pretty [overflow-wrap:anywhere]",
  studyTitle: "text-[1.5rem] font-[600] tracking-[-0.025em]",
  studyYear: "font-mono text-[0.875rem] font-[500]",
} as const;

type SharedVariant = NonNullable<
  Parameters<typeof sharedTypographyVariants>[0]
>["variant"];

type PageVariant = keyof typeof pageTypography;

const isPageVariant = (variant: string): variant is PageVariant =>
  Object.hasOwn(pageTypography, variant);

export const typographyVariants = ({
  variant,
  className,
}: {
  variant?: PageVariant | SharedVariant;
  className?: string;
} = {}) =>
  cn(
    variant && isPageVariant(variant)
      ? pageTypography[variant]
      : sharedTypographyVariants({ variant: variant as SharedVariant }),
    className
  );

export type TypographyProps<T extends keyof HTMLElementTagNameMap = "span"> =
  Omit<SharedTypographyProps<T>, "variant"> & {
    variant?: PageVariant | SharedVariant;
  };

export const Typography = <
  const T extends keyof HTMLElementTagNameMap = "span",
>({
  as,
  variant,
  className,
  ...props
}: TypographyProps<T>) =>
  createElement(as ?? "span", {
    ...props,
    className: typographyVariants({ className, variant }) || undefined,
  });

/** Canvas APIs accept CSS font shorthands rather than DOM components. */
export const canvasTypography = {
  forceEquation: "500 15px ui-monospace, monospace",
  forceLabel: "600 12px ui-monospace, monospace",
  forceReadout: "600 11px ui-monospace, monospace",
} as const;
