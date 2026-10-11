import { cn } from "@personal-site/ui/lib/utils";
import type { CSSProperties } from "react";
import { inkGrainTexture } from "./ink-grain";
import styles from "./ink-heading.module.css";

export function InkHeading({ className }: { className?: string }) {
  return (
    <h1 className={cn("relative", className)}>
      <span
        className={styles.flatInk}
        style={{ "--ink-grain": `url("${inkGrainTexture}")` } as CSSProperties}
      >
        Benjamin Schachter
      </span>
    </h1>
  );
}
