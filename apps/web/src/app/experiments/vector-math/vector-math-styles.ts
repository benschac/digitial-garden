import { cn } from "@personal-site/ui/lib/utils";

import layout from "./vector-math.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  actionButton: cn(
    "min-h-[44px] px-4",
    "border border-[#94897a] rounded-[999px]",
    "text-[var(--experiment-ink)]",
    "bg-transparent",
    "cursor-pointer",
    "border border-[#94897a]",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px] focus-visible:outline-3",
    "focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]"
  ),
  activeControl: layout.activeControl,
  activeInput: cn(
    "col-span-full min-h-[44px]",
    "accent-[#a33f2b]",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]"
  ),
  activeLabel:
    "font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[var(--experiment-muted)]",
  activeMethod: layout.activeMethod,
  activeMethodDescription: cn(
    "col-span-full m-0",
    "text-[var(--experiment-muted)]"
  ),
  activeName: "font-mono",
  activeOutput: "font-mono",
  activeSummary: layout.activeSummary,
  canvas: layout.canvas,
  canvasFrame: layout.canvasFrame,
  cardDetail: "font-mono text-[#aaa99f]",
  cardLabel:
    "font-mono text-[0.7rem] tracking-[0.1em] uppercase text-[#9f9f95]",
  experiment: cn(
    "w-[min(100%,_92rem)] mx-auto overflow-hidden",
    "border border-[var(--experiment-line)] bg-[#faf7f0]",
    "[box-shadow:0_2rem_6rem_rgb(65_50_30_/_13%)]"
  ),
  experimentHeader: layout.experimentHeader,
  experimentTitle: "max-w-[18ch] m-0",
  eyebrow: "text-[#a33f2b]",
  footerBar: layout.footerBar,
  footerNote: cn(
    "font-mono text-[0.7rem] tracking-[0.08em] uppercase",
    "m-0",
    "text-[var(--experiment-muted)]"
  ),
  header: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:clamp(4rem,_10vw,_8rem)_clamp(2.75rem,_6vw,_5rem)]"
  ),
  intro: cn(
    "max-w-[43rem]",
    "[margin:2rem_0_0]",
    "text-[var(--experiment-muted)]"
  ),
  keyboardControl: layout.keyboardControl,
  keyboardControls: layout.keyboardControls,
  keyboardGroup: layout.keyboardGroup,
  keyboardInput: cn(
    "min-h-[44px]",
    "accent-[#a33f2b]",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]"
  ),
  keyboardLegend: cn(
    "font-mono text-[0.7rem] tracking-[0.08em] uppercase",
    "pt-5"
  ),
  keyboardOutput: "text-[var(--experiment-ink)] text-right",
  kicker: cn("[margin:0_0_1rem]", "text-[#a33f2b]"),
  methodButton: layout.methodButton,
  methodCount: cn("m-0", "text-[#386547]"),
  methodDescription:
    "text-[0.72rem] leading-[1.35] text-[var(--experiment-muted)]",
  methodDescriptionSelected: "text-[#aaa99f]",
  methodGrid: layout.methodGrid,
  methodName: "font-mono text-[0.78rem] font-[600]",
  nav: cn("w-[min(100%,_76rem)] mx-auto", "text-[var(--experiment-muted)]"),
  navLink: cn(
    "inline-flex min-w-11 items-center justify-center",
    "text-2xl",
    "text-inherit no-underline",
    "min-h-[44px]",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]"
  ),
  note: "max-w-[48rem] m-0",
  notes: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:2rem_5rem]",
    "text-[var(--experiment-muted)]"
  ),
  page: layout.page,
  readout: layout.readout,
  resultCard: layout.resultCard,
  resultValue: "font-display text-[2rem] font-[450] text-[#f4eee0]",
  title: "max-w-[10ch] m-0",
  vectorCard: cn(
    "leading-[1.5]",
    "grid gap-[0.55rem] p-6",
    "border-b border-b-[#3c3e38]"
  ),
  vectorValueBlue: "font-display text-[2rem] font-[450] text-[#62b6cb]",
  vectorValueYellow: "font-display text-[2rem] font-[450] text-[#f1b84b]",
  warning: "font-[450] text-[#ef9a82]",
  workspace: layout.workspace,
};

export default styles;
