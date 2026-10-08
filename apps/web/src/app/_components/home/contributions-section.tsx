import { Heading, Text } from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { featureLink } from "./styles";

export function ContributionsSection() {
  return (
    <section
      id="contributions"
      aria-labelledby="contributions-heading"
      className={cn(
        "col-span-full mt-12 grid grid-cols-subgrid pt-6 min-[72rem]:items-baseline",
        "border-t border-[color-mix(in_srgb,currentColor_18%,transparent)]",
      )}
    >
      <Heading
        id="contributions-heading"
        variant="section"
        className="mb-4 whitespace-nowrap md:col-span-full min-[72rem]:col-[1]"
      >
        Contributions
      </Heading>
      <article className="col-span-full max-w-[65ch] font-reading text-lg min-[72rem]:col-[2/-1]">
        <Heading
          as="h3"
          variant="item"
          className="mb-4 text-balance font-[family-name:var(--home-entry-font,var(--font-sans))]"
        >
          Tracking down a silent iOS build failure
        </Heading>
        <Text>
          My iOS app built successfully but never got past the splash screen. I
          traced the failure to how PostHog and Sentry’s Expo plugins
          interacted, then documented a reproduction, root cause, and verified
          workaround for the maintainers.
        </Text>
        <Text className="mt-4">
          PostHog subsequently merged a fix with regression coverage.
        </Text>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-sans">
            <Link
              className={featureLink}
              href="https://github.com/PostHog/posthog-js/issues/4285"
            >
              Read my report <span aria-hidden="true">&nbsp;↗</span>
            </Link>
            <Link
              className={featureLink}
              href="https://github.com/PostHog/posthog-js/pull/4291"
            >
              See the fix <span aria-hidden="true">&nbsp;↗</span>
            </Link>
          </div>
          {/* Official, unmodified logo: https://posthog.com/handbook/brand/assets */}
          <Image
            src="/images/posthog-logo.svg"
            alt="PostHog"
            width={120}
            height={21}
            className="h-auto w-[120px] shrink-0"
          />
        </div>
      </article>
    </section>
  );
}
