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
      codeLineNumber: "before:font-mono",
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
