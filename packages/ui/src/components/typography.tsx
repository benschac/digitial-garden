import { createElement } from "react";
import type { ComponentProps, ComponentPropsWithRef } from "react";
import { tv } from "tailwind-variants";
import type { VariantProps } from "tailwind-variants";

import { cn } from "../lib/utils";

/** Visual style is independent of heading level. Recipes also style existing elements. */
export const headingVariants = tv({
  base: "m-0",
  defaultVariants: { variant: "section" },
  variants: {
    variant: {
      display: cn(
        "font-display text-[clamp(3.5rem,11vw,9rem)] font-[450] leading-[1.02] text-balance [font-optical-sizing:auto]",
        "tracking-[calc(-0.045em+var(--font-editorial-display-tracking-adjustment,0em))]"
      ),
      feature:
        "font-display text-[clamp(1.75rem,3vw,2.5rem)] font-[450] leading-[1.1] text-balance",
      item: "font-sans text-xl font-[550] leading-[1.4]",
      section:
        "font-display text-[clamp(1.75rem,4vw,2.25rem)] font-[450] italic leading-[1.1] [font-optical-sizing:auto]",
      sectionSidebar: cn(
        "font-display text-[clamp(1.75rem,4vw,2.25rem)] font-[450] italic leading-[1.1]",
        "[font-optical-sizing:auto]",
        "min-[72rem]:text-[1.75rem]"
      ),
      subtitle:
        "font-reading text-[1.2rem] font-normal leading-[1.35] text-ink",
      subtitleItalic:
        "font-reading text-[1.2rem] font-normal italic leading-[1.35] text-ink",
    },
  },
});

export type HeadingProps = ComponentProps<"h2"> &
  VariantProps<typeof headingVariants> & {
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  };

export const Heading = ({
  as: Tag = "h2",
  variant,
  className,
  ...props
}: HeadingProps) => (
  <Tag className={headingVariants({ className, variant })} {...props} />
);

export const textVariants = tv({
  base: "m-0 text-pretty [font-optical-sizing:auto]",
  defaultVariants: { variant: "body" },
  variants: {
    variant: {
      body: "font-reading text-lg leading-normal text-editorial-muted",
      caption: "font-sans text-[0.8125rem] leading-normal text-editorial-muted",
      date: "font-sans text-[0.8125rem] leading-normal text-editorial-muted md:tabular-nums",
      metadata:
        "font-sans text-xs leading-[1.35] tracking-[0.08em] text-editorial-muted uppercase",
      small: "font-sans text-sm leading-normal text-ink",
    },
  },
});

export type TextProps = ComponentProps<"p"> & VariantProps<typeof textVariants>;

/** Editorial paragraph text. Spacing and reading measure belong to the consumer. */
export const Text = ({ variant, className, ...props }: TextProps) => (
  <p className={textVariants({ className, variant })} {...props} />
);

/** Typography-only recipes for native text, controls, and existing components.
 * No base styles: each role preserves its intended inheritance and margins.
 */
export const typographyVariants = tv({
  variants: {
    variant: {
      code: "font-mono text-sm",
      codeCaption: "font-mono text-xs leading-relaxed",
      codeLineNumber: "before:font-mono",
      inherit: "[font:inherit]",
      inputCompact: "text-sm!",
      medium: "font-medium",
      microLabel: "font-sans text-[10px] uppercase tracking-wide",
      mono: "font-mono",
      normal: "font-normal",
      ui: "font-sans",
      uiBody: "text-sm",
      uiBodyNormal: "font-normal text-sm",
      uiBodyTight: "text-sm leading-tight",
      uiCaption: "text-xs",
      uiCaptionLabel: "font-medium text-xs",
      uiCaptionNormal: "font-normal text-xs",
      uiLabel: "font-medium text-sm",
      uiPrompt: "font-medium text-sm leading-snug",
      uiTitle: "font-medium text-5xl tracking-tighter",
    },
  },
});

export type TypographyProps<T extends keyof HTMLElementTagNameMap = "span"> = {
  as?: T;
  className?: string;
} & VariantProps<typeof typographyVariants> &
  Omit<ComponentPropsWithRef<T>, "as" | "className" | "variant">;

/** Choose the semantic element independently of its visual role. No wrapper DOM. */
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
