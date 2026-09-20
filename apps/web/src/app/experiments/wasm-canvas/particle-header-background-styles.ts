import { cn } from "@personal-site/ui/lib/utils";

// Local utility recipes for this component.
const styles = {
  controls: cn(
    "grid min-w-0 grid-cols-3 gap-x-[clamp(1.5rem,4vw,3rem)] gap-y-6 p-[clamp(1.5rem,3vw,2rem)]",
    "border border-[rgb(105_215_255/28%)] bg-[rgb(5_7_13/68%)] text-[#f8f5ee] backdrop-blur-[18px]",
    "disabled:opacity-[0.62] [@media(max-width:42rem)]:grid-cols-1",
  ),
  label: cn(
    "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1",
    "font-sans text-[0.875rem] font-[650] tracking-[0.02em]",
  ),
  legend: cn(
    "text-[#aab7c8]",
    "px-2",
    "font-sans text-[0.78rem] font-[650] tracking-[0.085em] uppercase",
  ),
  output: "text-[#aab7c8] text-right tabular-nums",
  input: cn(
    "accent-[#69d7ff]",
    "col-span-full min-h-[44px] w-full",
    "focus-visible:outline-3 focus-visible:outline-[#69d7ff] focus-visible:outline-offset-[2px]",
  ),
  status: cn(
    "text-[#aab7c8]",
    "col-span-full",
    "font-sans text-[0.78rem] tracking-[0.04em]",
  ),
};

export default styles;
