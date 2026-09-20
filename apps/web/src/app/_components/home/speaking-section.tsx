import { Heading, Text } from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { featureLink, focusRing } from "./styles";

export function SpeakingSection() {
  return (
    <section
      id="featured-talk"
      aria-labelledby="featured-talk-heading"
      className={cn(
        "col-span-full grid grid-cols-subgrid pt-6",
        "border-t border-[color-mix(in_srgb,currentColor_18%,transparent)]",
      )}
    >
      <Heading
        id="featured-talk-heading"
        variant="sectionSidebar"
        className="mb-4 md:col-span-full min-[72rem]:col-[1]"
      >
        Speaking
      </Heading>
      <Link
        className={cn(
          "group/talk col-span-full grid grid-cols-subgrid items-center gap-y-6 min-[72rem]:col-[2/-1]",
          "text-inherit no-underline",
          focusRing,
        )}
        href="https://www.youtube.com/watch?v=UIBd0D4ny78&t=26s"
      >
        <Image
          className="block h-auto w-full md:col-span-2"
          src="/images/appjs-talk.jpg"
          alt=""
          width={1280}
          height={720}
          sizes="(min-width: 80rem) 692px, (min-width: 72rem) 55vw, (min-width: 48rem) 65vw, 100vw"
        />
        <div>
          <Text variant="metadata" className="max-w-[36ch]">
            App.js Conf · 2026
          </Text>
          <Heading as="h3" variant="feature" className="mt-3 mb-6">
            Emit Once,
            <br />
            Notify Anywhere
          </Heading>
          <span
            className={cn(
              featureLink,
              "group-hover/talk:decoration-current group-focus-visible/talk:decoration-current",
            )}
          >
            Watch the talk
          </span>
        </div>
      </Link>
    </section>
  );
}
