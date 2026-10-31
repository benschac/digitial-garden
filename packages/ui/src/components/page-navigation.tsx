import type { ComponentProps } from "react";

import { cn } from "../lib/utils";

/** Compact page navigation. Supply links and optional context as children. */
export const PageNavigation = ({
  className,
  ...props
}: ComponentProps<"nav">) => (
  <nav
    className={cn(
      "flex items-center justify-between",
      "font-mono text-[0.72rem] tracking-[0.1em] uppercase",
      className
    )}
    {...props}
  />
);
