import { typographyVariants } from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import { Hero } from "./_components/home/hero";
import { PastWorkSection } from "./_components/home/past-work-section";
import { SpeakingSection } from "./_components/home/speaking-section";
import { PageTransition } from "./_components/page-transition";

export default function Home() {
  return (
    <PageTransition className="overflow-x-clip">
      <main
        className={cn(
          "isolate mx-auto grid max-w-[80rem] grid-cols-1 gap-x-8 p-[clamp(1.5rem,4vw,3rem)]",
          "text-ink",
          typographyVariants({ variant: "ui" }),
          "md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]",
          "min-[72rem]:grid-cols-[8rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]",
        )}
      >
        <Hero />
        <SpeakingSection />
        <PastWorkSection />
      </main>
    </PageTransition>
  );
}
