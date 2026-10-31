import { cn } from "@personal-site/ui/lib/utils";

// Local utility recipes for this component.
const styles = {
  controls: cn(
    "grid min-h-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-[0.65rem] p-3",
    "max-h-[min(30rem,calc(100dvh_-_6rem))] overflow-y-auto overscroll-contain",
    "[@media(max-width:32rem)]:items-stretch [@media(max-width:32rem)]:grid-cols-[minmax(0,1fr)]",
  ),
  select: cn(
    "min-h-11 min-w-0 w-full appearance-none py-2.5 pr-10 pl-3",
    "rounded-[0.75rem] border border-[color-mix(in_srgb,var(--color-ink)_22%,transparent)] bg-paper text-ink",
    "cursor-pointer font-sans text-sm font-normal leading-5",
    "hover:border-current focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ),
  selectWrapper: "relative block min-w-0 w-full",
  selectChevron:
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-editorial-muted",
  switcher: cn(
    "fixed bottom-[max(0.75rem,_env(safe-area-inset-bottom))] right-[max(0.75rem,_env(safe-area-inset-right))] z-[100]",
    "text-[var(--color-ink)]",
  ),
  launcher: "flex items-center gap-[0.65rem] hidden:hidden",
  surface: cn(
    "absolute right-0 bottom-0 origin-bottom-right data-[open=false]:pointer-events-none",
    "flex w-[22.5rem] flex-col overflow-hidden rounded-2xl",
    "bg-[color-mix(in_srgb,_var(--color-paper)_94%,_transparent)] border",
    "border-[color-mix(in_srgb,_var(--color-ink)_18%,_transparent)]",
    "[box-shadow:0_0.5rem_1.5rem_color-mix(in_srgb,_var(--color-ink)_10%,_transparent)]",
    "max-w-[calc(100vw_-_1.5rem)]",
    "max-h-[calc(100dvh_-_1.5rem)]",
  ),
  toolbar: cn(
    "flex shrink-0 items-center justify-between gap-3 p-3",
    "border-b border-[color-mix(in_srgb,var(--color-ink)_15%,transparent)]",
  ),
  title: "text-sm font-medium",
  animationToggle: "flex min-h-11 cursor-pointer items-center gap-1.5 text-xs",
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
  iconToggle: cn(
    "grid size-11 shrink-0 place-items-center justify-self-end p-0",
    "rounded-full border border-[color-mix(in_srgb,var(--color-ink)_18%,transparent)] bg-paper text-ink shadow-sm",
    "cursor-pointer hover:border-current",
    "focus-visible:outline-3 focus-visible:outline-current focus-visible:outline-offset-2",
  ),
  shortcut: "col-span-full m-0 text-xs text-editorial-muted",
  label: "text-[var(--color-editorial-muted)]",
};

export default styles;
