import { Typography } from "@personal-site/ui/components/typography";
import type { ReactNode } from "react";

interface CalloutProps {
  children: ReactNode;
  title?: string;
}

export function Callout({ children, title = "Note" }: CalloutProps) {
  return (
    <aside aria-label={title} data-mdx-callout>
      <Typography as="strong">{title}</Typography>
      <div>{children}</div>
    </aside>
  );
}
