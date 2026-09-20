"use client";

import { Button as ButtonPrimitive } from "@base-ui/react";
import { useState } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "../lib/utils";
import type { StyledComponentProps } from "./types";

const buttonVariants = tv({
  base: "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  variants: {
    pressFeedback: {
      true: cn(
        "transition-[transform,opacity] duration-[120ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
        "data-[pointer-pressed]:[transform:scale(0.98)]",
        "motion-reduce:transition-opacity motion-reduce:duration-100",
        "motion-reduce:data-[pointer-pressed]:transform-none motion-reduce:data-[pointer-pressed]:opacity-85",
      ),
    },
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive:
        "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
      outline:
        "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost:
        "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      default: "h-9 px-4 py-2 has-[>svg]:px-3",
      xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
      sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
      lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
      icon: "size-9",
      "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
      "icon-sm": "size-8",
      "icon-lg": "size-10",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

function Button({
  className,
  variant = "default",
  size = "default",
  pressFeedback = false,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onBlur,
  ...props
}: StyledComponentProps<typeof ButtonPrimitive> &
  VariantProps<typeof buttonVariants>) {
  const [pointerPressed, setPointerPressed] = useState(false);

  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={buttonVariants({ variant, size, pressFeedback, className })}
      {...props}
      data-pointer-pressed={
        pressFeedback && pointerPressed && !props.disabled ? "" : undefined
      }
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (
          pressFeedback &&
          !props.disabled &&
          !event.defaultPrevented &&
          event.isPrimary &&
          event.button === 0
        ) {
          setPointerPressed(true);
        }
      }}
      onPointerUp={(event) => {
        setPointerPressed(false);
        onPointerUp?.(event);
      }}
      onPointerLeave={(event) => {
        setPointerPressed(false);
        onPointerLeave?.(event);
      }}
      onPointerCancel={(event) => {
        setPointerPressed(false);
        onPointerCancel?.(event);
      }}
      onBlur={(event) => {
        setPointerPressed(false);
        onBlur?.(event);
      }}
    />
  );
}

export { Button, buttonVariants };
