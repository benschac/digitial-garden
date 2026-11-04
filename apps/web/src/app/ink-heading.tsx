import { cn } from "@personal-site/ui/lib/utils";
import type { CSSProperties } from "react";

import { inkGrainTexture } from "./ink-grain";

import styles from "./ink-heading.module.css";

const inkStyle: CSSProperties & Record<`--${string}`, string> = {
  "--ink-grain": `url("${inkGrainTexture}")`,
};

export const InkHeading = ({ className }: { className?: string }) => (
  <h1 className={cn("relative", className)}>
    <span className={styles.flatInk} style={inkStyle}>
      Benjamin Schachter
    </span>
  </h1>
);
