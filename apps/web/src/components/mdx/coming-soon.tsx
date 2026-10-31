import { Badge } from "@personal-site/ui/components/badge";
import { cn } from "@personal-site/ui/lib/utils";

export const ComingSoon = () => (
  <Badge
    variant="outline"
    data-prose-exclude
    className={cn(
      "ml-2 align-middle",
      "border-[#c39138] bg-[#f4d48b] text-[#69400e]",
      "shadow-[0_2px_3px_#70460f26,inset_0_1px_0_#fff4cf]",
      "font-sans text-xs font-semibold leading-5 tracking-normal normal-case"
    )}
  >
    Coming soon
  </Badge>
);
