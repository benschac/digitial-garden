import { cn } from "@personal-site/ui/lib/utils";
import layout from "./callout.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  content: layout.content,
  callout: cn(
    "bg-[#eee7d9] border-l-[2px] border-l-[var(--blog-accent,_#8b3a2a)]",
    "[padding:1.1rem_1.2rem]",
  ),
  title: "font-sans text-[0.78rem] font-[650] tracking-[0.08em] uppercase",
};

export default styles;
