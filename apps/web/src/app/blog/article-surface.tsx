import { ViewTransition } from "react";

/** A separate paper surface expands without stretching the article's text. */
export function ArticleSurface({
  slug,
  className,
  expanded = false,
}: {
  slug: string;
  className: string;
  expanded?: boolean;
}) {
  return (
    <ViewTransition
      name={`post-surface-${slug}`}
      default="none"
      share={{
        "blog-open": "blog-surface-open",
        "blog-close": "blog-surface-close",
        // Shared transitions use the incoming boundary's class, including Back.
        default: expanded ? "blog-surface-open" : "blog-surface-close",
      }}
    >
      <div aria-hidden="true" className={className} />
    </ViewTransition>
  );
}
