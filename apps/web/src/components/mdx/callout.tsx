import type { ReactNode } from "react";

interface CalloutProps {
  children: ReactNode;
  title?: string;
}

export function Callout({ children, title = "Note" }: CalloutProps) {
  return (
    <aside aria-label={title}>
      <strong>{title}</strong>
      <div>{children}</div>
    </aside>
  );
}
