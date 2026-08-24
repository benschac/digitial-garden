import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import { getSiteUrl } from "@/lib/site";
import "./reset.css";

const newsreader = Newsreader({
  axes: ["opsz"],
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-newsreader",
});

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
    <html className={newsreader.variable} lang="en">
      <body>{children}</body>
    </html>
  );
}
