import { cn } from "@personal-site/ui/lib/utils";

import layout from "./perlin-noise.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  control: layout.control,
  controlButton: cn(
    "min-h-[2.75rem] px-[1.1rem]",
    "border border-[#94897a] rounded-[999px]",
    "text-[var(--experiment-ink)]",
    "bg-transparent",
    "cursor-pointer",
    "enabled:hover:border-[#a33f2b] enabled:hover:text-[#a33f2b] disabled:cursor-not-allowed disabled:opacity-[0.42]",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]"
  ),
  controlInput: cn(
    "col-span-full w-full min-h-[2.75rem]",
    "accent-[#a33f2b]",
    "cursor-pointer",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]"
  ),
  controlOutput: "font-mono text-[#a33f2b]",
  controls: layout.controls,
  errorMessage: cn(
    "m-0",
    "[padding:1rem_clamp(1.5rem,_3vw,_2.5rem)]",
    "border-b border-b-[var(--experiment-line)]",
    "text-[#8d2f20]",
    "bg-[#f7dfd6]"
  ),
  experiment: cn(
    "w-[min(100%,_92rem)] mx-auto overflow-hidden",
    "border border-[var(--experiment-line)] bg-[#faf7f0]",
    "[box-shadow:0_2rem_6rem_rgb(65_50_30_/_13%)]"
  ),
  experimentHeader: layout.experimentHeader,
  experimentTitle: "max-w-[18ch] m-0",
  eyebrow: "text-[#a33f2b]",
  header: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:clamp(4rem,_10vw,_8rem)_clamp(2.75rem,_6vw,_5rem)]"
  ),
  intro: cn(
    "max-w-[42rem]",
    "[margin:2rem_0_0]",
    "text-[var(--experiment-muted)]"
  ),
  kicker: cn("[margin:0_0_1rem]", "text-[#a33f2b]"),
  metric: "grid gap-[0.3rem]",
  metricLabel: "text-[var(--experiment-muted)]",
  nav: cn("w-[min(100%,_76rem)] mx-auto", "text-[var(--experiment-muted)]"),
  navLink: cn(
    "inline-flex min-w-11 items-center justify-center",
    "text-2xl",
    "text-inherit no-underline",
    "min-h-[44px]",
    "hover:text-[var(--experiment-ink)] focus-visible:outline-3 focus-visible:outline-[#a33f2b]",
    "focus-visible:outline-offset-[3px]"
  ),
  note: "max-w-[46rem] m-0",
  notes: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:2rem_5rem]",
    "text-[var(--experiment-muted)]"
  ),
  page: layout.page,
  panel: layout.panel,
  panelCanvas: cn(
    "w-full",
    "[aspect-ratio:1]",
    "bg-[#131618]",
    "[image-rendering:auto]"
  ),
  panelCaption: cn(
    "font-mono text-[0.68rem] tracking-[0.06em] uppercase",
    "flex justify-between gap-4 pt-[0.9rem]"
  ),
  panelDetail: "text-[var(--experiment-muted)] text-right",
  panels: layout.panels,
  readout: layout.readout,
  readoutNote: layout.readoutNote,
  runtimeStatus: layout.runtimeStatus,
  threeCanvas: "w-full h-full",
  threeCanvasFrame: layout.threeCanvasFrame,
  threeControl: layout.threeControl,
  threeControlActions: "flex gap-[0.65rem]",
  threeControlButton: cn(
    "min-h-[2.75rem] px-[1.1rem]",
    "border border-[#94897a] rounded-[999px]",
    "text-[var(--experiment-ink)]",
    "bg-transparent",
    "cursor-pointer",
    "enabled:hover:border-[#a33f2b] enabled:hover:text-[#a33f2b] disabled:cursor-not-allowed disabled:opacity-[0.42]",
    "focus-visible:outline-3 focus-visible:outline-[#a33f2b] focus-visible:outline-offset-[3px]"
  ),
  threeControlInput: cn(
    "col-span-full w-full min-h-[2.75rem]",
    "accent-[#a33f2b]",
    "cursor-pointer",
    "disabled:cursor-not-allowed disabled:opacity-[0.48] focus-visible:outline-3 focus-visible:outline-[#a33f2b]",
    "focus-visible:outline-offset-[3px]"
  ),
  threeControlOutput: "font-mono text-[#a33f2b]",
  threeControls: layout.threeControls,
  threeDescription: cn(
    "leading-[1.55]",
    "max-w-[42rem]",
    "[margin:1.25rem_0_0]",
    "text-[var(--experiment-muted)]"
  ),
  threeExperiment: cn(
    "w-[min(100%,_92rem)]",
    "[margin:clamp(3rem,_8vw,_7rem)_auto_0]",
    "overflow-hidden",
    "border border-[var(--experiment-line)] bg-[#faf7f0]",
    "[box-shadow:0_2rem_6rem_rgb(65_50_30_/_13%)]"
  ),
  threeHeader: layout.threeHeader,
  threeLegend: layout.threeLegend,
  threeLoading: layout.threeLoading,
  threeMetric: layout.threeMetric,
  threeMetricLabel:
    "font-mono text-[0.66rem] tracking-[0.08em] uppercase text-[var(--experiment-muted)]",
  threeMetricStatus: cn(
    "font-mono text-[0.66rem] tracking-[0.08em] uppercase text-[var(--experiment-muted)]",
    "data-[status=ready]:text-[#386547] data-[status=error]:text-[#a33f2b]"
  ),
  threeMetricValue: "text-[1.5rem] font-[500]",
  threeTitle: cn(
    "font-display text-[clamp(2.4rem,_5vw,_4.5rem)]",
    "[font-optical-sizing:auto]",
    "font-[450] tracking-[calc(_-0.045em_+_var(--font-editorial-display-tracking-adjustment)_)] leading-[0.95]",
    "max-w-[15ch] m-0"
  ),
  title: "max-w-[11ch] m-0",
};

export default styles;
