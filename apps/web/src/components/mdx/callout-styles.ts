import { cn } from "@personal-site/ui/lib/utils";

import layout from "./callout.module.css";

// Local utility recipes; CSS retains the authored layout and motion rules.
const styles = {
  callout: cn(
    layout.paper,
    "rounded-2xl border border-[#c8c9b9]",
    "px-5 py-5 sm:px-7 sm:py-6",
    "text-[#303d34] shadow-[0_2px_8px_#243b320a,inset_0_1px_0_#ffffff80]"
  ),
  content: layout.content,
  editorialNote: layout.editorialNote,
  editorialNoteTitle: layout.editorialNoteTitle,
  title: cn(
    "block font-sans text-[0.78rem] font-[650] tracking-[0.08em] uppercase",
    "text-[#3f594a]"
  ),
};

export default styles;
