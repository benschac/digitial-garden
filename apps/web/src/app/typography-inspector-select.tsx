"use client";

import { cn } from "@personal-site/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import styles from "./editorial-font-switcher-styles";

export function InspectorSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <span className={styles.selectWrapper}>
      <select {...props} className={cn(styles.select, className)} />
      <ChevronDown
        aria-hidden="true"
        size={16}
        className={styles.selectChevron}
      />
    </span>
  );
}
