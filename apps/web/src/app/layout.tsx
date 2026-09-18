import type { Metadata } from "next";
import { Newsreader, Sorts_Mill_Goudy } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import type { ReactNode } from "react";
import { getSiteUrl } from "@/lib/site";
import { EditorialFontPreference } from "./editorial-font-preference";
import { EditorialFontSwitcher } from "./editorial-font-switcher";
import { editorialFontPreferenceInitScript } from "./editorial-fonts";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./reset.css";

const newsreader = Newsreader({
  axes: ["opsz"],
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-newsreader",
});

const sortsMillGoudy = Sorts_Mill_Goudy({
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-sorts-mill-goudy",
  weight: "400",
});

const superiorSerif = localFont({
  display: "swap",
  preload: false,
  src: [
    {
      path: "./fonts/LTSuperiorSerif-Regular.otf",
      style: "normal",
      weight: "400",
    },
    {
      path: "./fonts/LTSuperiorSerif-Medium.otf",
      style: "normal",
      weight: "500",
    },
    {
      path: "./fonts/LTSuperiorSerif-Semibold.otf",
      style: "normal",
      weight: "600",
    },
    {
      path: "./fonts/LTSuperiorSerif-Bold.otf",
      style: "normal",
      weight: "700",
    },
    {
      path: "./fonts/LTSuperiorSerif-ExtraBold.otf",
      style: "normal",
      weight: "800",
    },
  ],
  variable: "--font-superior-serif",
});

const bonbance = localFont({
  display: "swap",
  src: "./fonts/bonbance-bold-condensed.woff2",
  style: "normal",
  variable: "--font-bonbance",
  weight: "700",
});

const goudyBookletter = localFont({
  display: "swap",
  src: "./fonts/goudy-bookletter-1911.woff",
  style: "normal",
  variable: "--font-goudy-bookletter",
  weight: "400",
});

const libreCaslonCondensed = localFont({
  display: "swap",
  src: "./fonts/libre-caslon-condensed-variable.woff2",
  style: "normal",
  variable: "--font-libre-caslon-condensed",
});

const tenderness = localFont({
  display: "swap",
  src: "./fonts/tenderness-regular.woff",
  style: "normal",
  variable: "--font-tenderness",
  weight: "400",
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
    <html
      className={`${newsreader.variable} ${sortsMillGoudy.variable} ${superiorSerif.variable} ${bonbance.variable} ${goudyBookletter.variable} ${libreCaslonCondensed.variable} ${tenderness.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <Script
          id="editorial-font-preference-init"
          strategy="beforeInteractive"
        >
          {editorialFontPreferenceInitScript}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <EditorialFontPreference>
          {children}
          {process.env.NODE_ENV === "development" ? (
            <EditorialFontSwitcher />
          ) : null}
        </EditorialFontPreference>
      </body>
    </html>
  );
}
