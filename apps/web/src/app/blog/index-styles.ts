import { cn } from "@personal-site/ui/lib/utils";

import layout from "./index.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  layout: layout.layout,
  link: layout.link,
  page: cn(layout.page, "paper-surface"),
  post: "grid gap-3 min-w-0",
  postDate: cn("[margin:0.25rem_0_0]", "text-[var(--blog-supporting-text)]"),
  postItem: layout.postItem,
  postLink:
    "hover:underline hover:[text-decoration-thickness:1px] hover:underline-offset-[0.15em]",
  postList: cn(
    "focus-visible:outline-2 focus-visible:outline-[var(--blog-accent)] focus-visible:outline-offset-[5px]",
    "w-full max-w-[42rem] list-none m-0 p-0",
    "[scroll-margin-block-start:1.5rem]"
  ),
  postSummary: cn("m-0", "text-[var(--blog-supporting-text)]"),
  postTitle: "m-0",
  shell: layout.shell,
  skipLink: layout.skipLink,
  surface: cn("absolute inset-0 z-[-1] pointer-events-none", "paper-surface"),
  title: "m-0",
};

export default styles;
