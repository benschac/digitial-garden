import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "Benjamin Schachter",
    template: "%s | Benjamin Schachter",
  },
  description: "The personal site of Benjamin Schachter.",
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
