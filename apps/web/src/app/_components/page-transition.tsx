import { cn } from "@personal-site/ui/lib/utils";
import { ViewTransition } from "react";
import type { ReactNode } from "react";

const sharedNavigation = {
  default: "none",
  "nav-back": "page-back",
  "nav-forward": "page-forward",
  "nav-lateral": "page-crossfade",
};

const entering = {
  ...sharedNavigation,
  "nav-back": "page-back-enter",
  "nav-forward": "page-forward-enter",
};

const exiting = {
  ...sharedNavigation,
  "nav-back": "page-back-exit",
  "nav-forward": "page-forward-exit",
};

/** Page-owned boundary: updates and untyped background work stay silent. */
export const PageTransition = ({
  children,
  className,
  name,
}: {
  children: ReactNode;
  className?: string;
  name?: string;
}) => (
  <ViewTransition
    name={name}
    default="none"
    enter={entering}
    exit={exiting}
    share={sharedNavigation}
  >
    <div className={cn("page-transition-surface", className)}>{children}</div>
  </ViewTransition>
);
