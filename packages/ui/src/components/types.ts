import type { ComponentProps, ElementType } from "react";

export type StyledComponentProps<T extends ElementType> = Omit<
  ComponentProps<T>,
  "className"
> & { className?: string };
