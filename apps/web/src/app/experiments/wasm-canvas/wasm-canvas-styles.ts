import { cn } from "@personal-site/ui/lib/utils";

import layout from "./wasm-canvas.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  canvas: layout.canvas,
  canvasFrame: layout.canvasFrame,
  control: layout.control,
  controlButton: cn(
    "min-h-[2.75rem]",
    "[padding:0_1rem]",
    "border border-[#344257] rounded-[999px]",
    "text-[var(--experiment-ink)]",
    "bg-[#151b26]",
    "cursor-pointer",
    "hover:border-[#69d7ff] focus-visible:outline-2 focus-visible:outline-[#69d7ff] focus-visible:outline-offset-[3px]"
  ),
  controlInput: cn("col-span-full w-full", "accent-[#69d7ff]"),
  controlOutput: cn(
    "[font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace]",
    "text-[#69d7ff]"
  ),
  controls: layout.controls,
  experiment: layout.experiment,
  eyebrow: "text-[#69d7ff]",
  fullWidthExperiment: layout.fullWidthExperiment,
  header: cn(
    "w-[min(100%,_76rem)] mx-auto",
    "[padding-block:clamp(4rem,_10vw,_8rem)_clamp(2.5rem,_6vw,_5rem)]"
  ),
  intro: cn("max-w-[41rem]", "[margin:2rem_0_0]", "text-[#a8b4c5]"),
  nav: cn("w-[min(100%,_76rem)] mx-auto", "text-[var(--experiment-muted)]"),
  navLink: cn(
    "hover:text-[var(--experiment-ink)] focus-visible:outline-2 focus-visible:outline-[#69d7ff]",
    "focus-visible:outline-offset-[3px]",
    "text-inherit no-underline"
  ),
  note: "max-w-[44rem] m-0",
  notes: cn(
    "w-[min(100%,_76rem)] mx-auto box-border",
    "[padding:2rem_0_5rem]",
    "text-[#778397]"
  ),
  page: layout.page,
  tallCanvasFrame: layout.tallCanvasFrame,
  telemetry: cn(
    "absolute right-4 bottom-4 left-4 flex justify-between",
    "text-[#738094]",
    "pointer-events-none"
  ),
  title: "max-w-[13ch] m-0",
};

export default styles;
