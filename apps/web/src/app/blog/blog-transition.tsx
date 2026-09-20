import { type ReactNode, ViewTransition } from "react";
import "./motion.css";

const navigation = {
  "nav-forward": "blog-forward",
  "nav-back": "blog-back",
  default: "none",
};

const entering = {
  ...navigation,
  "blog-open": "blog-content",
  "blog-close": "blog-underlay",
};

const exiting = {
  ...navigation,
  "blog-open": "blog-underlay",
  "blog-close": "blog-content",
};

/** Card expansion for list/detail; directional travel for adjacent articles. */
export function BlogTransition({
  children,
  name,
  view,
}: {
  children: ReactNode;
  name?: string;
  view: "index" | "article";
}) {
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
          "nav-forward": "page-forward-enter",
          "nav-back": "page-back-enter",
        }),
        default: fallback,
      }}
      exit={{
        ...exiting,
        ...(view === "index" && {
          "nav-forward": "page-forward-exit",
          "nav-back": "page-back-exit",
        }),
        default: fallback,
      }}
      share={{ ...navigation, default: "page-crossfade" }}
    >
      {children}
    </ViewTransition>
  );
}
