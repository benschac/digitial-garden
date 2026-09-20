import { Typography } from "@personal-site/ui/components/typography";
import type { ReactNode } from "react";
import styles from "./callout-styles";

interface CalloutProps {
  children: ReactNode;
  title?: string;
}

export function Callout({ children, title = "Note" }: CalloutProps) {
  return (
    <aside aria-label={title} className={styles.callout} data-mdx-callout>
      <Typography as="strong" className={styles.title}>
        {title}
      </Typography>
      <div className={styles.content}>{children}</div>
    </aside>
  );
}
