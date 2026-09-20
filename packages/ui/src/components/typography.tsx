import {
  type ComponentProps,
  type ComponentPropsWithRef,
  createElement,
} from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "../lib/utils";

/** Visual style is independent of heading level. Recipes also style existing elements. */
export const headingVariants = tv({
  base: "m-0",
  variants: {
    variant: {
      display: cn(
        "font-display text-[clamp(3.5rem,11vw,9rem)] font-[450] leading-[1.02] text-balance [font-optical-sizing:auto]",
        "tracking-[calc(-0.045em+var(--font-editorial-display-tracking-adjustment,0em))]",
      ),
      section:
        "font-display text-[clamp(1.75rem,4vw,2.25rem)] font-[450] italic leading-[1.1] [font-optical-sizing:auto]",
      sectionSidebar: cn(
        "font-display text-[clamp(1.75rem,4vw,2.25rem)] font-[450] italic leading-[1.1]",
        "[font-optical-sizing:auto]",
        "min-[72rem]:text-[1.75rem]",
      ),
      feature:
        "font-display text-[clamp(1.75rem,3vw,2.5rem)] font-[450] leading-[1.1] text-balance",
      item: "font-sans text-xl font-[550] leading-[1.4]",
      subtitle:
        "font-reading text-[1.2rem] font-normal leading-[1.35] text-ink",
      subtitleItalic:
        "font-reading text-[1.2rem] font-normal italic leading-[1.35] text-ink",
    },
  },
  defaultVariants: { variant: "section" },
});

export type HeadingProps = ComponentProps<"h2"> &
  VariantProps<typeof headingVariants> & {
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  };

export function Heading({
  as: Tag = "h2",
  variant,
  className,
  ...props
}: HeadingProps) {
  return <Tag className={headingVariants({ variant, className })} {...props} />;
}

export const textVariants = tv({
  base: "m-0 text-pretty [font-optical-sizing:auto]",
  variants: {
    variant: {
      body: "font-reading text-lg leading-normal text-editorial-muted",
      small: "font-sans text-sm leading-normal text-ink",
      caption: "font-sans text-[0.8125rem] leading-normal text-editorial-muted",
      date: "font-sans text-[0.8125rem] leading-normal text-editorial-muted md:tabular-nums",
      metadata:
        "font-sans text-xs leading-[1.35] tracking-[0.08em] text-editorial-muted uppercase",
    },
  },
  defaultVariants: { variant: "body" },
});

export type TextProps = ComponentProps<"p"> & VariantProps<typeof textVariants>;

/** Editorial paragraph text. Spacing and reading measure belong to the consumer. */
export function Text({ variant, className, ...props }: TextProps) {
  return <p className={textVariants({ variant, className })} {...props} />;
}

/** Typography-only recipes for native text, controls, and existing components.
 * No base styles: each role preserves its intended inheritance and margins.
 */
export const typographyVariants = tv({
  variants: {
    variant: {
      ui: "font-sans",
      inherit: "[font:inherit]",
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
      uiBody: "text-sm",
      uiCaption: "text-xs",
      uiLabel: "font-medium text-sm",
      uiCaptionLabel: "font-medium text-xs",
      uiBodyNormal: "font-normal text-sm",
      uiCaptionNormal: "font-normal text-xs",
      uiBodyTight: "text-sm leading-tight",
      uiPrompt: "font-medium text-sm leading-snug",
      uiTitle: "font-medium text-5xl tracking-tighter",
      medium: "font-medium",
      normal: "font-normal",
      mono: "font-mono",
      code: "font-mono text-sm",
      codeCaption: "font-mono text-xs leading-relaxed",
      microLabel: "font-sans text-[10px] uppercase tracking-wide",
      inputCompact: "text-sm!",
      codeDescendantsCompact: "[&_pre]:text-xs [&_code]:text-xs",
      codeLineNumber: "before:font-mono",
      experimentVectorIntro:
        "font-reading text-[clamp(1.2rem,_2vw,_1.55rem)] leading-[1.45]",
      experimentVectorMethodGrid: cn(
        "[&_strong]:font-mono [&_strong]:text-[0.78rem] [&_strong]:font-[600]",
        "[&_span]:text-[0.72rem] [&_span]:leading-[1.35]",
      ),
      experimentVectorActiveMethod: cn(
        "[&_>_div_span]:font-mono [&_>_div_span]:text-[0.68rem]",
        "[&_>_div_span]:tracking-[0.08em] [&_>_div_span]:uppercase",
        "[&_label_span]:font-mono [&_label_span]:text-[0.68rem]",
        "[&_label_span]:tracking-[0.08em] [&_label_span]:uppercase",
        "[&_>_div_strong]:font-mono",
        "[&_output]:font-mono",
      ),
      experimentVectorActiveMethodDescription: "text-[0.8rem]",
      experimentVectorResultCard: cn(
        "[&_span]:font-mono [&_span]:text-[0.7rem]",
        "[&_span]:tracking-[0.1em] [&_span]:uppercase",
        "[&_strong]:font-display [&_strong]:text-[2rem] [&_strong]:font-[450]",
        "[&_small]:font-mono",
        "leading-[1.5]",
      ),
      experimentVectorWarning:
        "[&&]:font-sans [&&]:text-[1rem] [&&]:leading-[1.4]",
      experimentVectorFooterBar:
        "[&_p]:font-mono [&_p]:text-[0.7rem] [&_p]:tracking-[0.08em] [&_p]:uppercase",
      experimentVectorKeyboardControls: cn(
        "[&_legend]:font-mono [&_legend]:text-[0.7rem]",
        "[&_legend]:tracking-[0.08em] [&_legend]:uppercase",
        "[&_label]:font-mono [&_label]:text-[0.75rem]",
      ),
      experimentNoiseIntro:
        "font-reading text-[clamp(1.2rem,_2vw,_1.55rem)] [font-optical-sizing:auto] leading-[1.45] text-pretty",
      experimentNoisePanel: cn(
        "[&_figcaption]:font-mono [&_figcaption]:text-[0.68rem]",
        "[&_figcaption]:tracking-[0.06em] [&_figcaption]:uppercase",
      ),
      experimentNoiseMetricLabel:
        "font-mono text-[0.65rem] tracking-[0.07em] uppercase",
      experimentNoiseMetricValue: "font-mono text-[1rem] font-[500]",
      experimentNoiseReadout:
        "[&_p]:font-reading [&_p]:text-[1.1rem] [&_p]:italic",
      experimentNoiseControls: "[&_label]:text-[0.78rem] [&_output]:font-mono",
      experimentNoiseThreeHeader: cn(
        "[&_h2]:font-display [&_h2]:text-[clamp(2.4rem,_5vw,_4.5rem)]",
        "[&_h2]:[font-optical-sizing:auto]",
        "[&_h2]:font-[450]",
        "[&_h2]:tracking-[calc(_-0.045em_+_var(--font-editorial-display-tracking-adjustment)_)]",
        "[&_h2]:leading-[0.95]",
        "[&_>_div_>_p:last-child]:leading-[1.55]",
      ),
      experimentNoiseThreeMetric: cn(
        "font-mono",
        "[&_span]:text-[0.66rem]",
        "[&_span]:tracking-[0.08em] [&_span]:uppercase",
        "[&_small]:text-[0.66rem]",
        "[&_small]:tracking-[0.08em] [&_small]:uppercase",
        "[&_strong]:text-[1.5rem] [&_strong]:font-[500]",
      ),
      experimentNoiseThreeLegend:
        "font-mono text-[0.68rem] tracking-[0.1em] uppercase",
      experimentNoiseThreeControls:
        "[&_label]:text-[0.76rem] [&_output]:font-mono",
      experimentNoiseThreeLoading:
        "font-mono text-[0.72rem] tracking-[0.1em] uppercase",
      experimentForcesIntro:
        "font-reading text-[clamp(1.2rem,_2vw,_1.55rem)] leading-[1.5]",
      experimentForcesStatus:
        "font-mono text-[0.7rem] tracking-[0.08em] uppercase",
      experimentForcesTabs:
        "[&_button]:[font:inherit] [&_span]:font-mono [&_span]:text-[0.7rem]",
      experimentForcesTelemetry:
        "font-mono text-[0.68rem] tracking-[0.07em] uppercase",
      experimentForcesControlCopy: cn(
        "[&_>_span]:font-mono [&_>_span]:text-[0.68rem]",
        "[&_>_span]:tracking-[0.09em] [&_>_span]:uppercase",
        "[&_h3]:font-display [&_h3]:text-[2rem] [&_h3]:font-[450]",
        "[&_p]:text-[0.88rem] [&_p]:leading-[1.6]",
      ),
      experimentForcesRangeControl: "text-[0.78rem] [&_output]:font-mono",
      experimentForcesActions: cn(
        "[&_button]:[font-family:inherit] [&_button]:[font-weight:inherit] [&_button]:[font-style:inherit]",
        "[&_button]:[font-variant:inherit] [&_button]:[font-stretch:inherit] [&_button]:[line-height:inherit]",
        "[&_button]:text-[0.8rem]",
      ),
      experimentForcesPrimaryButton: cn(
        "[font-family:inherit] [font-weight:inherit] [font-style:inherit] [font-variant:inherit]",
        "[font-stretch:inherit] [line-height:inherit] text-[0.8rem]",
      ),
      experimentForcesLawGrid: cn(
        "[&_article_>_span]:font-mono [&_article_>_span]:text-[0.68rem]",
        "[&_article_>_span]:tracking-[0.08em] [&_article_>_span]:uppercase",
        "[&_h3]:font-reading [&_h3]:text-[1.3rem] [&_h3]:font-[500] [&_h3]:leading-[1.25]",
        "[&_p]:text-[0.88rem] [&_p]:leading-[1.65]",
        "[&_p]:text-pretty",
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
      experimentParticleControls:
        "[&_label]:text-[0.78rem] [&_output]:[font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace]",
      experimentDisplay: cn(
        "font-display text-[clamp(3.7rem,_9vw,_8rem)] font-[430]",
        "tracking-[calc(_-0.06em_+_var(--font-editorial-display-tracking-adjustment)_)]",
        "leading-[0.88]",
        "text-balance",
      ),
      experimentNoiseDisplay: cn(
        "font-display text-[clamp(3.6rem,_9vw,_8rem)] [font-optical-sizing:auto] font-[430]",
        "tracking-[calc(_-0.06em_+_var(--font-editorial-display-tracking-adjustment)_)]",
        "leading-[0.88]",
        "text-balance",
        "[@media(max-width:680px)]:text-[clamp(3.4rem,_18vw,_5.2rem)]",
      ),
      experimentParticleDisplay:
        "text-[clamp(3rem,_8vw,_7rem)] font-[500] tracking-[-0.065em] leading-[0.92]",
      experimentHeading: cn(
        "font-display text-[clamp(2rem,_4vw,_3.5rem)] font-[450]",
        "tracking-[calc(_-0.035em_+_var(--font-editorial-display-tracking-adjustment)_)]",
        "leading-[1]",
      ),
      experimentForcesHeading:
        "font-display text-[clamp(2rem,_4vw,_3.5rem)] font-[450] tracking-[-0.035em] leading-[1]",
      experimentNoiseHeading: cn(
        "font-display text-[clamp(2rem,_4vw,_3.5rem)] [font-optical-sizing:auto] font-[450]",
        "tracking-[calc(_-0.035em_+_var(--font-editorial-display-tracking-adjustment)_)]",
        "leading-[1]",
      ),
      experimentForcesSectionHeading:
        "font-display text-[clamp(2.6rem,_5vw,_4.75rem)] font-[450] tracking-[-0.04em] leading-[0.95]",
      experimentPage: "font-sans",
      experimentKicker: "font-mono text-[0.72rem] tracking-[0.12em] uppercase",
      experimentStatus: "font-mono text-[0.72rem] tracking-[0.08em] uppercase",
      experimentNotes: "text-[0.88rem] leading-[1.6]",
      experimentVectorCard: cn(
        "[&_span]:font-mono [&_span]:text-[0.7rem]",
        "[&_span]:tracking-[0.1em] [&_span]:uppercase",
        "[&_strong]:font-display [&_strong]:text-[2rem] [&_strong]:font-[450]",
        "[&_small]:font-mono",
      ),
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
        "text-[length:var(--text-deck)] leading-[var(--leading-deck)] text-pretty",
      articleTitle: cn(
        "font-display text-[clamp(3.25rem,2rem_+_5vw,6.75rem)] font-[450]",
        "tracking-[calc(-0.047em_+_var(--font-editorial-display-tracking-adjustment))]",
        "leading-[1]",
        "text-balance",
        "[@media(max-width:42rem)]:text-[clamp(2.85rem,14vw,4.5rem)]",
        "[@media(max-width:42rem)]:tracking-[calc(-0.04em_+_var(--font-editorial-display-tracking-adjustment))]",
      ),
      articleMetadata:
        "font-sans text-[length:var(--text-meta)] tabular-nums tracking-[0.04em] leading-[1.55]",
      articleProse:
        "text-[length:var(--text-body)] font-[400] leading-[var(--leading-body)] ui-article-prose",
      articleNavigationTitle:
        "font-display text-[clamp(1.25rem,_2.2vw,_1.7rem)] leading-[1.15]",
      articleNavigationLabel:
        "font-sans text-[0.65rem] font-[650] tracking-[0.085em] uppercase",
      articleControls: "ui-article-controls",
      studyInterface: "font-sans",
      studyTitle: "text-[1.5rem] font-[600] tracking-[-0.025em]",
      studyDescription: "text-[0.875rem] leading-[1.6]",
      studyNavigation: "text-[0.875rem]",
      studyOptionTitle: "text-[1rem] leading-[1.4]",
      studyMasthead: "text-[0.8125rem]",
      studySiteLink: "font-[600]",
      studyBlogTitle: cn(
        "font-display font-[400] text-[3rem]",
        "tracking-[calc(_-0.035em_+_var(--font-editorial-display-tracking-adjustment)_)]",
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
    },
  },
});

export type TypographyProps<T extends keyof HTMLElementTagNameMap = "span"> = {
  as?: T;
  className?: string;
} & VariantProps<typeof typographyVariants> &
  Omit<ComponentPropsWithRef<T>, "as" | "className" | "variant">;

/** Choose the semantic element independently of its visual role. No wrapper DOM. */
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
