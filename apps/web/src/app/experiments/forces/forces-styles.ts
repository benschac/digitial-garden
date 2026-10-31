import { cn } from "@personal-site/ui/lib/utils";

import layout from "./forces.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  actionButton: cn(
    "min-h-[44px] px-4",
    "border border-[#465164] rounded-[999px]",
    "text-[var(--experiment-ink)]",
    "bg-transparent",
    "cursor-pointer",
    "focus-visible:outline-3 focus-visible:outline-[#86efac] focus-visible:outline-offset-[3px] [font-family:inherit] [font-weight:inherit] [font-style:inherit] [font-variant:inherit] [font-stretch:inherit] [line-height:inherit]",
    "text-[0.8rem]"
  ),
  actions: "flex gap-3 mt-auto",
  canvas: "block w-full h-full",
  canvasFrame: layout.canvasFrame,
  controlDescription: cn(
    "text-[0.88rem] leading-[1.6]",
    "m-0",
    "text-[var(--experiment-muted)]"
  ),
  controlInput: cn(
    "col-span-full min-h-[44px]",
    "accent-[#86efac]",
    "focus-visible:outline-3 focus-visible:outline-[#86efac] focus-visible:outline-offset-[3px]"
  ),
  controlLabel:
    "font-mono text-[0.68rem] tracking-[0.09em] uppercase text-[#86efac]",
  controlOutput: "font-mono text-[#86efac]",
  controlTitle: cn(
    "font-display text-[2rem] font-[450]",
    "[margin:0.65rem_0_0.8rem]"
  ),
  controls: layout.controls,
  equation: cn("min-w-0 mt-5 overflow-x-auto", "text-[#c7cfdb]"),
  experiment: cn(
    "w-[min(100%,_92rem)] mx-auto overflow-hidden",
    "border border-[var(--experiment-line)] bg-[#11151d]",
    "[box-shadow:0_2rem_7rem_rgb(0_0_0_/_45%)]"
  ),
  experimentHeader: layout.experimentHeader,
  experimentTitle: "max-w-[19ch] m-0",
  eyebrow: "text-[#86efac]",
  header: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:clamp(4rem,_10vw,_8rem)_clamp(3rem,_7vw,_6rem)]"
  ),
  intro: cn("max-w-[44rem]", "[margin:2rem_0_0]", "text-[#b8c1cf]"),
  kicker: cn("[margin:0_0_1rem]", "text-[#86efac]"),
  law: layout.law,
  lawDescription: cn(
    "text-[0.88rem] leading-[1.65] text-pretty",
    "my-0",
    "text-[var(--experiment-muted)]"
  ),
  lawGrid: layout.lawGrid,
  lawNumber:
    "font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[#86efac]",
  lawTitle: layout.lawTitle,
  laws: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:clamp(5rem,_10vw,_9rem)_3rem]"
  ),
  lawsTitle: cn("max-w-[12ch]", "[margin:0_0_3rem]"),
  nav: cn("w-[min(100%,_76rem)] mx-auto", "text-[var(--experiment-muted)]"),
  navLink: cn(
    "text-inherit no-underline",
    "min-h-[44px]",
    "hover:text-[var(--experiment-ink)] focus-visible:outline-3 focus-visible:outline-[#86efac]",
    "focus-visible:outline-offset-[3px]"
  ),
  note: "max-w-[48rem] m-0",
  notes: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:0_5rem]",
    "text-[#778294]"
  ),
  page: layout.page,
  primaryButton: cn(
    "min-h-[44px] px-4",
    "border border-[#465164] rounded-[999px]",
    "text-[var(--experiment-ink)]",
    "bg-transparent",
    "cursor-pointer w-full",
    "border-[#86efac] bg-[#86efac]",
    "text-[#0b1610]",
    "disabled:cursor-default disabled:opacity-[0.55] focus-visible:outline-3 focus-visible:outline-[#86efac]",
    "focus-visible:outline-offset-[3px]"
  ),
  rangeControl: layout.rangeControl,
  status: layout.status,
  tab: layout.tab,
  tabNumber: "font-mono text-[0.7rem] text-[#86efac]",
  tabs: layout.tabs,
  telemetry: cn(
    "absolute right-5 bottom-4 left-5 flex justify-between",
    "text-[#8994a6]",
    "pointer-events-none"
  ),
  title: "max-w-[10ch] m-0",
  workspace: layout.workspace,
};

export default styles;
