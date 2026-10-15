import { cn } from "@personal-site/ui/lib/utils";
import layout from "./article.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  nextPost: layout.nextPost,
  page: cn(layout.page, "ui-article-typography"),
  article: layout.article,
  link: layout.link,
  prose: layout.prose,
  postHeader: layout.postHeader,
  svgPostHeader: layout.svgPostHeader,
  svgHeaderPattern: layout.svgHeaderPattern,
  landscapePostHeader: layout.landscapePostHeader,
  landscapeBackground: layout.landscapeBackground,
  landscapeTitle: cn(layout.landscapeTitle, "leading-[1.06]"),
  landscapeSeries: cn(
    layout.landscapeSeries,
    "font-sans text-[0.75rem] font-medium leading-[1.5] tracking-[0.08em] uppercase",
  ),
  landscapeHeadline: layout.landscapeHeadline,
  landscapeSummary: layout.landscapeSummary,
  landscapeMetadata: layout.landscapeMetadata,
  postNavigation: layout.postNavigation,
  backLink: layout.backLink,
  backNavigation: layout.backNavigation,
  particleBackNavigation: layout.particleBackNavigation,
  title: layout.title,
  summary: layout.summary,
  particlePostHeader: layout.particlePostHeader,
  particleHeaderCanvas: layout.particleHeaderCanvas,
  metadata: layout.metadata,
  particleHeaderControls: layout.particleHeaderControls,
  surface: cn("fixed inset-0 z-[-1] pointer-events-none", "paper-surface"),
  navigationLink: cn("inline-flex flex-col min-h-[44px]", "no-underline"),
  navigationLabel: cn("text-[var(--blog-muted)]", "mb-[0.55rem]"),
};

export default styles;
