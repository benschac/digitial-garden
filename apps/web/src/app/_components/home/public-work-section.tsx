import { Heading, Text } from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { deckleFilterIds } from "../../paper-filters";
import { Annotation } from "./annotation";
import styles from "./public-work.module.css";
import { dateText, featureLink, itemHeading, sectionLabel } from "./styles";

const card = cn(
  styles.card,
  "col-span-full max-w-[65ch] min-[72rem]:col-[2/-1]",
  // Text keeps the column edge; the sheet hangs into the gutter.
  "-mx-4 px-4 py-6 sm:-mx-7 sm:px-7 sm:py-7",
  "font-reading text-lg",
);

function sheet(deckle: number, tilt: string) {
  return {
    "--home-deckle": `url(#${deckleFilterIds[deckle]})`,
    "--home-card-tilt": tilt,
  } as CSSProperties;
}

export function PublicWorkSection() {
  return (
    <section
      id="public-work"
      aria-labelledby="public-work-heading"
      className={cn(
        "col-span-full mt-12 grid grid-cols-subgrid pt-6 min-[72rem]:items-baseline",
        "border-t border-[color-mix(in_srgb,currentColor_18%,transparent)]",
      )}
    >
      <Heading
        id="public-work-heading"
        variant="section"
        className={cn(
          sectionLabel,
          "mb-4 whitespace-nowrap md:col-span-full min-[72rem]:col-[1]",
        )}
      >
        Selected public work
      </Heading>
      <article className={card} style={sheet(0, "-0.3deg")}>
        <Heading as="h3" variant="item" className={cn(itemHeading, "mb-1")}>
          Investigating an iOS launch failure
        </Heading>
        <Text variant="date" className={cn(dateText, "mb-4")}>
          <time dateTime="2026-07">July 2026</time>
        </Text>
        <Text>
          My iOS app built successfully but never got past the splash screen. I
          traced the failure to how PostHog and Sentry’s Expo plugins interacted
          and shared a reproduction, root cause, and verified workaround with
          the maintainers on GitHub.
        </Text>
        <Text className="mt-4">
          PostHog subsequently{" "}
          <Annotation kind="circle">merged a fix</Annotation> with regression
          coverage.
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
          {/* Official logo file, unmodified; the ink treatment is CSS only: https://posthog.com/handbook/brand/assets */}
          <span className={cn(styles.taped, "shrink-0")}>
            <Image
              src="/images/posthog-logo.svg"
              alt="PostHog"
              width={120}
              height={21}
              className={cn(styles.inked, "block h-auto w-[120px]")}
            />
          </span>
        </div>
      </article>
      <article className={cn(card, "mt-8")} style={sheet(2, "0.25deg")}>
        <Heading as="h3" variant="item" className={cn(itemHeading, "mb-1")}>
          Making Tamagui’s starter work with Expo
        </Heading>
        <Text variant="date" className={cn(dateText, "mb-4")}>
          <time dateTime="2023-05">May 2023</time>
        </Text>
        <Text>
          I contributed a fix to Tamagui’s Solito starter for Expo Go and EAS
          updates and builds. The merged changes addressed incompatible
          dependencies, runtime configuration, and native toast handling.
        </Text>
        <figure
          className={cn(
            "m-0 mt-6 pl-5",
            "border-l-2 border-[color-mix(in_srgb,currentColor_18%,transparent)]",
          )}
        >
          <blockquote
            cite="https://github.com/tamagui/tamagui/pull/1173#issuecomment-1550657547"
            className="m-0"
          >
            <Text className="text-2xl italic text-ink">
              <Annotation kind="highlight">
                “this is heroic work, thank you”
              </Annotation>
            </Text>
          </blockquote>
          <figcaption className="mt-2 font-sans text-sm text-editorial-muted">
            <Link
              className={featureLink}
              href="https://github.com/tamagui/tamagui/pull/1173#issuecomment-1550657547"
            >
              Nate Wienert, Tamagui creator
              <span aria-hidden="true">&nbsp;↗</span>
            </Link>
          </figcaption>
        </figure>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-sans">
            <Link
              className={featureLink}
              href="https://github.com/tamagui/tamagui/pull/1173"
            >
              Read my contribution <span aria-hidden="true">&nbsp;↗</span>
            </Link>
          </div>
          <Link href="https://tamagui.dev/" className={featureLink}>
            {/* Official wordmark file, unmodified; the ink treatment is CSS only: https://github.com/tamagui/tamagui/blob/main/code/tamagui.dev/public/tamagui-words-logo.png */}
            <span
              className={styles.taped}
              style={{ "--home-logo-tilt": "1.25deg" } as CSSProperties}
            >
              <Image
                src="/images/tamagui-logo.png"
                alt="Tamagui"
                width={1242}
                height={136}
                sizes="120px"
                className={cn(styles.inked, "block h-auto w-[120px]")}
              />
            </span>
          </Link>
        </div>
      </article>
    </section>
  );
}
