import { typographyVariants } from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import { Hero } from "./_components/home/hero";
import { HomeFooter } from "./_components/home/home-footer";
import { PastWorkSection } from "./_components/home/past-work-section";
import { PublicWorkSection } from "./_components/home/public-work-section";
import { SpeakingSection } from "./_components/home/speaking-section";
import { PageTransition } from "./_components/page-transition";

export const metadata: Metadata = {
  openGraph: {
    type: "website",
    url: "/",
    title: "Benjamin Schachter",
    description: "The personal site of Benjamin Schachter.",
    images: [
      {
        url: "/social/home.jpg",
        width: 1200,
        height: 630,
        alt: "Benjamin Schachter with his illustrated portrait.",
      },
    ],
    videos: [
      {
        url: new URL("/social/home.mp4", getSiteUrl()),
        type: "video/mp4",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@benschac",
    title: "Benjamin Schachter",
    description: "The personal site of Benjamin Schachter.",
    images: ["/social/home.jpg"],
  },
};

export default function Home() {
  return (
    <PageTransition className="overflow-x-clip">
      <main
        className={cn(
          "isolate mx-auto grid max-w-[80rem] grid-cols-1 gap-x-8 p-[clamp(1.5rem,4vw,3rem)]",
          "text-ink",
          typographyVariants({ variant: "ui" }),
          "md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]",
          "min-[72rem]:grid-cols-[minmax(8rem,max-content)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]",
        )}
      >
        <Hero />
        <SpeakingSection />
        <PublicWorkSection />
        <PastWorkSection />
      </main>
      <HomeFooter />
    </PageTransition>
  );
}
