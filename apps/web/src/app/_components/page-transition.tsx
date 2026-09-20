import { type ReactNode, ViewTransition } from "react";

const sharedNavigation = {
  "nav-forward": "page-forward",
  "nav-back": "page-back",
  "nav-lateral": "page-crossfade",
  default: "none",
};

const entering = {
  ...sharedNavigation,
  "nav-forward": "page-forward-enter",
  "nav-back": "page-back-enter",
};

const exiting = {
  ...sharedNavigation,
  "nav-forward": "page-forward-exit",
  "nav-back": "page-back-exit",
};

/** Page-owned boundary: updates and untyped background work stay silent. */
export function PageTransition({
  children,
  name,
}: {
  children: ReactNode;
  name?: string;
}) {
  return (
    <ViewTransition
      name={name}
      default="none"
      enter={entering}
      exit={exiting}
      share={sharedNavigation}
    >
      <div className="page-transition-surface">{children}</div>
    </ViewTransition>
  );
}
