import { cn } from "@personal-site/ui/lib/utils";

import layout from "./article.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  article: layout.article,
  backLink: layout.backLink,
  backNavigation: layout.backNavigation,
  landscapeBackground: layout.landscapeBackground,
  landscapeHeadline: layout.landscapeHeadline,
  landscapeMetadata: layout.landscapeMetadata,
  landscapePostHeader: layout.landscapePostHeader,
  landscapeSeries: cn(
    layout.landscapeSeries,
    "font-sans text-[0.75rem] font-medium leading-[1.5] tracking-[0.08em] uppercase"
  ),
  landscapeSummary: layout.landscapeSummary,
  landscapeTitle: cn(layout.landscapeTitle, "leading-[1.06]"),
  link: layout.link,
  metadata: layout.metadata,
  navigationLabel: cn("text-[var(--blog-muted)]", "mb-[0.55rem]"),
  navigationLink: cn("inline-flex flex-col min-h-[44px]", "no-underline"),
  nextPost: layout.nextPost,
  page: cn(layout.page, "ui-article-typography"),
  particleBackNavigation: layout.particleBackNavigation,
  particleHeaderCanvas: layout.particleHeaderCanvas,
  particleHeaderControls: layout.particleHeaderControls,
  particlePostHeader: layout.particlePostHeader,
  postHeader: layout.postHeader,
  postNavigation: layout.postNavigation,
  prose: layout.prose,
  summary: layout.summary,
  surface: cn("fixed inset-0 z-[-1] pointer-events-none", "paper-surface"),
  svgHeaderPattern: layout.svgHeaderPattern,
  svgPostHeader: layout.svgPostHeader,
  title: layout.title,
};

export default styles;
