import { cn } from "@personal-site/ui/lib/utils";
import layout from "./forces.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  page: layout.page,
  experimentHeader: layout.experimentHeader,
  status: layout.status,
  tabs: layout.tabs,
  tab: layout.tab,
  workspace: layout.workspace,
  canvasFrame: layout.canvasFrame,
  controls: layout.controls,
  rangeControl: layout.rangeControl,
  lawGrid: layout.lawGrid,
  law: layout.law,
  lawTitle: layout.lawTitle,
  nav: cn("w-[min(100%,_76rem)] mx-auto", "text-[var(--experiment-muted)]"),
  header: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:clamp(4rem,_10vw,_8rem)_clamp(3rem,_7vw,_6rem)]",
  ),
  laws: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:clamp(5rem,_10vw,_9rem)_3rem]",
  ),
  notes: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:0_5rem]",
    "text-[#778294]",
  ),
  navLink: cn(
    "text-inherit no-underline",
    "min-h-[44px]",
    "hover:text-[var(--experiment-ink)] focus-visible:outline-3 focus-visible:outline-[#86efac]",
    "focus-visible:outline-offset-[3px]",
  ),
  eyebrow: "text-[#86efac]",
  kicker: cn("[margin:0_0_1rem]", "text-[#86efac]"),
  title: "max-w-[10ch] m-0",
  intro: cn("max-w-[44rem]", "[margin:2rem_0_0]", "text-[#b8c1cf]"),
  experiment: cn(
    "w-[min(100%,_92rem)] mx-auto overflow-hidden",
    "border border-[var(--experiment-line)] bg-[#11151d]",
    "[box-shadow:0_2rem_7rem_rgb(0_0_0_/_45%)]",
  ),
  experimentTitle: "max-w-[19ch] m-0",
  tabNumber: "font-mono text-[0.7rem] text-[#86efac]",
  canvas: "block w-full h-full",
  telemetry: cn(
    "absolute right-5 bottom-4 left-5 flex justify-between",
    "text-[#8994a6]",
    "pointer-events-none",
  ),
  controlLabel:
    "font-mono text-[0.68rem] tracking-[0.09em] uppercase text-[#86efac]",
  controlTitle: cn(
    "font-display text-[2rem] font-[450]",
    "[margin:0.65rem_0_0.8rem]",
  ),
  controlDescription: cn(
    "text-[0.88rem] leading-[1.6]",
    "m-0",
    "text-[var(--experiment-muted)]",
  ),
  controlOutput: "font-mono text-[#86efac]",
  controlInput: cn(
    "col-span-full min-h-[44px]",
    "accent-[#86efac]",
    "focus-visible:outline-3 focus-visible:outline-[#86efac] focus-visible:outline-offset-[3px]",
  ),
  actions: "flex gap-3 mt-auto",
  actionButton: cn(
    "min-h-[44px] px-4",
    "border border-[#465164] rounded-[999px]",
    "text-[var(--experiment-ink)]",
    "bg-transparent",
    "cursor-pointer",
    "focus-visible:outline-3 focus-visible:outline-[#86efac] focus-visible:outline-offset-[3px] [font-family:inherit] [font-weight:inherit] [font-style:inherit] [font-variant:inherit] [font-stretch:inherit] [line-height:inherit]",
    "text-[0.8rem]",
  ),
  primaryButton: cn(
    "min-h-[44px] px-4",
    "border border-[#465164] rounded-[999px]",
    "text-[var(--experiment-ink)]",
    "bg-transparent",
    "cursor-pointer w-full",
    "border-[#86efac] bg-[#86efac]",
    "text-[#0b1610]",
    "disabled:cursor-default disabled:opacity-[0.55] focus-visible:outline-3 focus-visible:outline-[#86efac]",
    "focus-visible:outline-offset-[3px]",
  ),
  lawsTitle: cn("max-w-[12ch]", "[margin:0_0_3rem]"),
  lawNumber:
    "font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[#86efac]",
  lawDescription: cn(
    "text-[0.88rem] leading-[1.65] text-pretty",
    "my-0",
    "text-[var(--experiment-muted)]",
  ),
  equation: cn("min-w-0 mt-5 overflow-x-auto", "text-[#c7cfdb]"),
  note: "max-w-[48rem] m-0",
};

export default styles;
