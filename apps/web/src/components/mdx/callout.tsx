import { Typography } from "@personal-site/ui/components/typography";
import type { ReactNode } from "react";

import styles from "./callout-styles";

interface CalloutProps {
  children: ReactNode;
  title?: string;
  variant?: "default" | "editorial";
}

export const Callout = ({
  children,
  title = "Note",
  variant = "default",
}: CalloutProps) => {
  const editorial = variant === "editorial";

  return (
    <aside
      aria-label={title}
      className={editorial ? styles.editorialNote : styles.callout}
      data-mdx-callout
      data-prose-exclude={editorial ? "" : undefined}
    >
      <Typography
        as="strong"
        className={editorial ? styles.editorialNoteTitle : styles.title}
      >
        {title}
      </Typography>
      <div className={styles.content}>{children}</div>
    </aside>
  );
};
