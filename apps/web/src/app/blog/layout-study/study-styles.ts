import { cn, tv } from "@personal-site/ui/lib/utils";

import layout from "./study.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  archiveArrow: cn("shrink-0", "text-[#59554e]"),
  archiveDate: layout.archiveDate,
  archiveLink: cn("flex justify-between items-baseline gap-4", "no-underline"),
  blogTitle: "m-0",
  comparison: layout.comparison,
  date: cn("block", "text-[#59554e]"),
  description: cn("text-[#514d46]", "max-w-[75ch]", "[margin:0.75rem_0_0]"),
  edition: "text-[#59554e]",
  featuredTitle: layout.featuredTitle,
  intro: tv({
    variants: {
      direction: { archive: "my-10", feature: "my-10", reader: "my-12" },
    },
  }),
  introduction: cn("text-[#514d46]", "[margin:0.75rem_0_0]"),
  link: cn(
    "text-inherit underline-offset-[0.2em]",
    "hover:text-[#8b3a2a] focus-visible:outline-2 focus-visible:outline-[#8b3a2a] focus-visible:outline-offset-[4px]",
    "active:opacity-[0.7]"
  ),
  masthead: cn(
    "flex justify-between flex-wrap gap-4 items-center",
    "[padding-block-end:1.25rem]",
    "border-b border-b-[#d4cec2]"
  ),
  navigationLink: "inline-flex items-center min-h-[44px]",
  option: layout.option,
  optionHeader: layout.optionHeader,
  optionLink: "inline-block py-2",
  optionTitle: "m-0",
  post: tv({
    variants: {
      direction: { archive: "py-7", feature: "py-7", reader: "py-8" },
    },
  }),
  postItem: tv({
    base: "min-w-0",
    variants: {
      variant: {
        card: "border border-[#d4cec2] px-5",
        featured: layout.featuredPostItem,
        plain: "border-t border-[#d4cec2]",
      },
    },
  }),
  postLink: cn(
    "no-underline",
    "hover:underline hover:[text-decoration-thickness:1px]"
  ),
  postTitle: "[margin:0.65rem_0_0]",
  posts: tv({
    base: "m-0 list-none p-0",
    variants: {
      direction: { archive: "", feature: layout.featurePosts, reader: "" },
    },
  }),
  prototype: layout.prototype,
  sheet: tv({
    base: "mx-auto p-[clamp(1.25rem,4cqi,3.5rem)]",
    variants: {
      direction: {
        archive: "max-w-[70rem]",
        feature: "max-w-[70rem]",
        reader: "max-w-[48rem]",
      },
    },
  }),
  siteLink: cn("no-underline", "min-h-[44px] inline-flex items-center"),
  study: cn(
    "text-[var(--color-ink)]",
    "bg-[#eae7e0]",
    "min-h-[100svh] p-[clamp(1rem,_2vw,_2rem)]"
  ),
  studyHeader: cn(
    "flex justify-between items-baseline gap-[1rem_3rem] flex-wrap",
    "[margin-block-end:2rem]"
  ),
  studyTitle: "m-0",
  summary: cn("text-[#514d46]", "[margin:0.875rem_0_0]", "max-w-[62ch]"),
  year: layout.year,
  yearItem: layout.yearItem,
  yearList: "list-none p-0 m-0",
  yearTitle: cn("text-[#8b3a2a]", "m-0 py-[0.875rem]"),
  years: layout.years,
};

export default styles;
