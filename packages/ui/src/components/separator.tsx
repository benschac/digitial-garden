"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react";

import { cn } from "../lib/utils";

import type { StyledComponentProps } from "./types";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: StyledComponentProps<typeof SeparatorPrimitive> & { decorative?: boolean }) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      role={decorative ? "none" : "separator"}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
