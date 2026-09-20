import { cn } from "@personal-site/ui/lib/utils";
import layout from "./article.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  nextPost: layout.nextPost,
  page: layout.page,
  link: layout.link,
  prose: layout.prose,
  postHeader: layout.postHeader,
  postNavigation: layout.postNavigation,
  backLink: layout.backLink,
  title: layout.title,
  summary: layout.summary,
  particlePostHeader: layout.particlePostHeader,
  particleHeaderCanvas: layout.particleHeaderCanvas,
  metadata: layout.metadata,
  particleHeaderControls: layout.particleHeaderControls,
  surface: cn(
    "fixed inset-0 z-[-1] pointer-events-none",
    "bg-[var(--blog-paper)]",
  ),
  navigationLink: cn("inline-flex flex-col min-h-[44px]", "no-underline"),
  navigationLabel: cn("text-[var(--blog-muted)]", "mb-[0.55rem]"),
};

export default styles;
