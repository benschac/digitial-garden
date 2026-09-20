import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/** Compact page navigation. Supply links and optional context as children. */
export function PageNavigation({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      className={cn(
        "flex items-center justify-between",
        "font-mono text-[0.72rem] tracking-[0.1em] uppercase",
        className,
      )}
      {...props}
    />
  );
}
