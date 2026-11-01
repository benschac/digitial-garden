"use client";

import { cn } from "@personal-site/ui/lib/utils";
import type { ReactNode } from "react";

import { useAvatarAnimation } from "./use-avatar-animation";

export const AnimatedAvatar = ({ children }: { children: ReactNode }) => {
  const stageRef = useAvatarAnimation();

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-1 [clip-path:inset(-100vmax_-100vmax_0)]"
    >
      <div
        className={cn(
          "absolute top-1/2 left-[75%] aspect-square",
          "w-[clamp(28rem,125vw,48rem)] sm:left-[72%] sm:w-[clamp(64rem,115vw,100rem)]",
          "opacity-[0.22] transform-[translate(-50%,-46%)_rotate(-12deg)]"
        )}
      >
        {children}
      </div>
    </div>
  );
};
