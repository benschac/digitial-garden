"use client";

import { cn } from "@personal-site/ui/lib/utils";
import { motion } from "motion/react";
import type { CSSProperties, ElementType } from "react";
import { memo, useMemo } from "react";

interface ShimmerElementProps {
  children: string;
  className?: string;
  style?: CSSProperties;
}

type ShimmerElement = ElementType<ShimmerElementProps>;

const createMotionComponent = motion.create<ShimmerElementProps, string>;

// Cache motion components at module level to avoid creating during render
const motionComponentCache = new Map<
  ShimmerElement,
  ReturnType<typeof createMotionComponent>
>();

const getMotionComponent = (element: ShimmerElement) => {
  let component = motionComponentCache.get(element);

  if (!component) {
    component = createMotionComponent(element);
    motionComponentCache.set(element, component);
  }

  return component;
};

export interface TextShimmerProps {
  children: string;
  as?: ShimmerElement;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const MotionComponent = getMotionComponent(Component);

  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  const style = {
    "--spread": `${dynamicSpread}px`,
    backgroundImage:
      "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
  } satisfies CSSProperties & { "--spread": string };

  return (
    <MotionComponent
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        className
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={style}
      transition={{
        duration,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </MotionComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);
