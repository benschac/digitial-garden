import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/** A short section label; pair with a semantic heading rather than replacing it. */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "m-0 mb-4",
        "font-mono text-[0.72rem] tracking-[0.12em] uppercase",
        className,
      )}
      {...props}
    />
  );
}
