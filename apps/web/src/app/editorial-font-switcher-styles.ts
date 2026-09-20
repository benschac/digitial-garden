import { cn } from "@personal-site/ui/lib/utils";

// Local utility recipes for this component.
const styles = {
  controls: cn(
    "grid grid-cols-[auto_minmax(11rem,1fr)] items-center gap-[0.65rem]",
    "hidden:hidden [@media(max-width:32rem)]:items-stretch [@media(max-width:32rem)]:grid-cols-[minmax(0,1fr)]",
  ),
  select: cn(
    "min-h-[44px] py-2 pr-8 pl-[0.65rem]",
    "rounded-none border border-[color-mix(in_srgb,var(--color-ink)_24%,transparent)] bg-paper text-ink",
    "cursor-pointer [font:inherit]",
    "hover:border-current focus-visible:outline-3 focus-visible:outline-current focus-visible:outline-offset-2",
    "[@media(max-width:32rem)]:flex-1 [@media(max-width:32rem)]:min-w-0",
  ),
  switcher: cn(
    "items-center",
    "bg-[color-mix(in_srgb,_var(--color-paper)_94%,_transparent)] border",
    "border-[color-mix(in_srgb,_var(--color-ink)_18%,_transparent)]",
    "bottom-[max(0.75rem,_env(safe-area-inset-bottom))]",
    "[box-shadow:0_0.5rem_1.5rem_color-mix(in_srgb,_var(--color-ink)_10%,_transparent)]",
    "text-[var(--color-ink)]",
    "grid gap-[0.65rem]",
    "[padding:0.35rem_0.45rem_0.35rem_0.7rem]",
    "fixed right-[max(0.75rem,_env(safe-area-inset-right))] z-[100] max-w-[calc(100vw_-_1.5rem)]",
    "max-h-[calc(100dvh_-_1.5rem)] overflow-y-auto",
  ),
  toggle: cn(
    "justify-self-end min-h-[44px]",
    "[padding:0.5rem_0.65rem]",
    "bg-[var(--color-paper)]",
    "text-inherit",
    "border-0",
    "[font:inherit]",
    "cursor-pointer",
    "focus-visible:outline-3 focus-visible:outline-[currentColor] focus-visible:outline-offset-[2px]",
  ),
  label: "text-[var(--color-editorial-muted)]",
};

export default styles;
