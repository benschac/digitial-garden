import { cn } from "@personal-site/ui/lib/utils";
import layout from "./index.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  page: layout.page,
  shell: layout.shell,
  link: layout.link,
  skipLink: layout.skipLink,
  layout: layout.layout,
  postItem: layout.postItem,
  postList: cn(
    "focus-visible:outline-2 focus-visible:outline-[var(--blog-accent)] focus-visible:outline-offset-[5px]",
    "w-full max-w-[42rem] list-none m-0 p-0",
    "[scroll-margin-block-start:1.5rem]",
  ),
  title: "m-0",
  surface: cn(
    "absolute inset-0 z-[-1] pointer-events-none",
    "bg-[var(--color-paper)]",
  ),
  post: "grid gap-3 min-w-0",
  postDate: cn("[margin:0.25rem_0_0]", "text-[var(--blog-supporting-text)]"),
  postTitle: "m-0",
  postLink:
    "hover:underline hover:[text-decoration-thickness:1px] hover:underline-offset-[0.15em]",
  postSummary: cn("m-0", "text-[var(--blog-supporting-text)]"),
};

export default styles;
