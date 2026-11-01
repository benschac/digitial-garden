import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export { tv, type VariantProps } from "tailwind-variants";

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
