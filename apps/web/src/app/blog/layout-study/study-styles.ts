import { cn, tv } from "@personal-site/ui/lib/utils";
import layout from "./study.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  sheet: tv({
    base: "mx-auto p-[clamp(1.25rem,4cqi,3.5rem)]",
    variants: {
      direction: {
        reader: "max-w-[48rem]",
        archive: "max-w-[70rem]",
        feature: "max-w-[70rem]",
      },
    },
  }),
  intro: tv({
    variants: {
      direction: { reader: "my-12", archive: "my-10", feature: "my-10" },
    },
  }),
  post: tv({
    variants: {
      direction: { reader: "py-8", archive: "py-7", feature: "py-7" },
    },
  }),
  posts: tv({
    base: "m-0 list-none p-0",
    variants: {
      direction: { reader: "", archive: "", feature: layout.featurePosts },
    },
  }),
  postItem: tv({
    base: "min-w-0",
    variants: {
      variant: {
        plain: "border-t border-[#d4cec2]",
        card: "border border-[#d4cec2] px-5",
        featured: layout.featuredPostItem,
      },
    },
  }),
  comparison: layout.comparison,
  option: layout.option,
  optionHeader: layout.optionHeader,
  prototype: layout.prototype,
  years: layout.years,
  year: layout.year,
  yearItem: layout.yearItem,
  archiveDate: layout.archiveDate,
  featuredTitle: layout.featuredTitle,
  study: cn(
    "text-[var(--color-ink)]",
    "bg-[#eae7e0]",
    "min-h-[100svh] p-[clamp(1rem,_2vw,_2rem)]",
  ),
  link: cn(
    "text-inherit underline-offset-[0.2em]",
    "hover:text-[#8b3a2a] focus-visible:outline-2 focus-visible:outline-[#8b3a2a] focus-visible:outline-offset-[4px]",
    "active:opacity-[0.7]",
  ),
  studyHeader: cn(
    "flex justify-between items-baseline gap-[1rem_3rem] flex-wrap",
    "[margin-block-end:2rem]",
  ),
  studyTitle: "m-0",
  description: cn("text-[#514d46]", "max-w-[75ch]", "[margin:0.75rem_0_0]"),
  navigationLink: "inline-flex items-center min-h-[44px]",
  optionTitle: "m-0",
  optionLink: "inline-block py-2",
  masthead: cn(
    "flex justify-between flex-wrap gap-4 items-center",
    "[padding-block-end:1.25rem]",
    "border-b border-b-[#d4cec2]",
  ),
  siteLink: cn("no-underline", "min-h-[44px] inline-flex items-center"),
  edition: "text-[#59554e]",
  blogTitle: "m-0",
  introduction: cn("text-[#514d46]", "[margin:0.75rem_0_0]"),
  date: cn("block", "text-[#59554e]"),
  postTitle: "[margin:0.65rem_0_0]",
  postLink: cn(
    "no-underline",
    "hover:underline hover:[text-decoration-thickness:1px]",
  ),
  summary: cn("text-[#514d46]", "[margin:0.875rem_0_0]", "max-w-[62ch]"),
  yearTitle: cn("text-[#8b3a2a]", "m-0 py-[0.875rem]"),
  yearList: "list-none p-0 m-0",
  archiveLink: cn("flex justify-between items-baseline gap-4", "no-underline"),
  archiveArrow: cn("shrink-0", "text-[#59554e]"),
};

export default styles;
