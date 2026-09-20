import { cn } from "@personal-site/ui/lib/utils";
import layout from "./vector-math.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  page: layout.page,
  experimentHeader: layout.experimentHeader,
  methodGrid: layout.methodGrid,
  methodButton: layout.methodButton,
  activeMethod: layout.activeMethod,
  activeSummary: layout.activeSummary,
  activeControl: layout.activeControl,
  workspace: layout.workspace,
  canvasFrame: layout.canvasFrame,
  canvas: layout.canvas,
  readout: layout.readout,
  resultCard: layout.resultCard,
  footerBar: layout.footerBar,
  keyboardControls: layout.keyboardControls,
  keyboardGroup: layout.keyboardGroup,
  keyboardControl: layout.keyboardControl,
  nav: cn("w-[min(100%,_76rem)] mx-auto", "text-[var(--experiment-muted)]"),
  header: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:clamp(4rem,_10vw,_8rem)_clamp(2.75rem,_6vw,_5rem)]",
  ),
  notes: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:2rem_5rem]",
    "text-[var(--experiment-muted)]",
  ),
  navLink: cn(
    "text-inherit no-underline",
    "min-h-[44px]",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]",
  ),
  eyebrow: "text-[#a33f2b]",
  kicker: cn("[margin:0_0_1rem]", "text-[#a33f2b]"),
  title: "max-w-[10ch] m-0",
  intro: cn(
    "max-w-[43rem]",
    "[margin:2rem_0_0]",
    "text-[var(--experiment-muted)]",
  ),
  experiment: cn(
    "w-[min(100%,_92rem)] mx-auto overflow-hidden",
    "border border-[var(--experiment-line)] bg-[#faf7f0]",
    "[box-shadow:0_2rem_6rem_rgb(65_50_30_/_13%)]",
  ),
  experimentTitle: "max-w-[18ch] m-0",
  methodCount: cn("m-0", "text-[#386547]"),
  methodDescription:
    "text-[0.72rem] leading-[1.35] text-[var(--experiment-muted)]",
  methodDescriptionSelected: "text-[#aaa99f]",
  activeLabel:
    "font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[var(--experiment-muted)]",
  activeMethodDescription: cn(
    "col-span-full m-0",
    "text-[var(--experiment-muted)]",
  ),
  activeInput: cn(
    "col-span-full min-h-[44px]",
    "accent-[#a33f2b]",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]",
  ),
  actionButton: cn(
    "min-h-[44px] px-4",
    "border border-[#94897a] rounded-[999px]",
    "text-[var(--experiment-ink)]",
    "bg-transparent",
    "cursor-pointer",
    "border border-[#94897a]",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px] focus-visible:outline-3",
    "focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]",
  ),
  vectorCard: cn(
    "leading-[1.5]",
    "grid gap-[0.55rem] p-6",
    "border-b border-b-[#3c3e38]",
  ),
  cardLabel:
    "font-mono text-[0.7rem] tracking-[0.1em] uppercase text-[#9f9f95]",
  cardDetail: "font-mono text-[#aaa99f]",
  vectorValueYellow: "font-display text-[2rem] font-[450] text-[#f1b84b]",
  vectorValueBlue: "font-display text-[2rem] font-[450] text-[#62b6cb]",
  resultValue: "font-display text-[2rem] font-[450] text-[#f4eee0]",
  warning: "font-[450] text-[#ef9a82]",
  footerNote: cn(
    "font-mono text-[0.7rem] tracking-[0.08em] uppercase",
    "m-0",
    "text-[var(--experiment-muted)]",
  ),
  keyboardLegend: cn(
    "font-mono text-[0.7rem] tracking-[0.08em] uppercase",
    "pt-5",
  ),
  keyboardInput: cn(
    "min-h-[44px]",
    "accent-[#a33f2b]",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]",
  ),
  keyboardOutput: "text-[var(--experiment-ink)] text-right",
  note: "max-w-[48rem] m-0",
  methodName: "font-mono text-[0.78rem] font-[600]",
  activeName: "font-mono",
  activeOutput: "font-mono",
};

export default styles;
