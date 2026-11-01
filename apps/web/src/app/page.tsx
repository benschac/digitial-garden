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
    description: "The personal site of Benjamin Schachter.",
    images: [
      {
        alt: "Benjamin Schachter with his illustrated portrait.",
        height: 630,
        url: "/social/home.jpg",
        width: 1200,
      },
    ],
    title: "Benjamin Schachter",
    type: "website",
    url: "/",
    videos: [
      {
        height: 630,
        type: "video/mp4",
        url: new URL("/social/home.mp4", getSiteUrl()),
        width: 1200,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@benschac",
    description: "The personal site of Benjamin Schachter.",
    images: ["/social/home.jpg"],
    title: "Benjamin Schachter",
  },
};

const Home = () => (
  <PageTransition className="overflow-x-clip">
    <main
      className={cn(
        "isolate mx-auto grid max-w-[80rem] grid-cols-1 gap-x-8 p-[clamp(1.5rem,4vw,3rem)]",
        "text-ink",
        typographyVariants({ variant: "ui" }),
        "md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]",
        "min-[72rem]:grid-cols-[minmax(8rem,max-content)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]"
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

export default Home;
