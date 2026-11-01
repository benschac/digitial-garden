import { ViewTransition } from "react";
import type { ReactNode } from "react";

import "./motion.css";

const navigation = {
  default: "none",
  "nav-back": "blog-back",
  "nav-forward": "blog-forward",
};

const entering = {
  ...navigation,
  "blog-close": "blog-underlay",
  "blog-open": "blog-content",
};

const exiting = {
  ...navigation,
  "blog-close": "blog-content",
  "blog-open": "blog-underlay",
};

/** Card expansion for list/detail; directional travel for adjacent articles. */
export const BlogTransition = ({
  children,
  name,
  view,
}: {
  children: ReactNode;
  name?: string;
  view: "index" | "article";
}) => {
  // History traversals have no transition type. The page's role still tells us
  // whether its snapshot is the list underneath or the article above it.
  const fallback = view === "index" ? "blog-underlay" : "blog-content";

  return (
    <ViewTransition
      name={name}
      default="none"
      enter={{
        ...entering,
        ...(view === "index" && {
          "nav-back": "page-back-enter",
          "nav-forward": "page-forward-enter",
        }),
        default: fallback,
      }}
      exit={{
        ...exiting,
        ...(view === "index" && {
          "nav-back": "page-back-exit",
          "nav-forward": "page-forward-exit",
        }),
        default: fallback,
      }}
      share={{ ...navigation, default: "page-crossfade" }}
    >
      {children}
    </ViewTransition>
  );
};
