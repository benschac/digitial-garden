import {
  Heading,
  Text,
  Typography,
} from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { featureLink, focusRing } from "./styles";

const pastWork = [
  {
    company: "Treasure It",
    role: "Founder / Software Engineer",
    dates: "March 2025 – Present",
  },
  {
    company: "Freelance Software Engineer",
    role: "Tenfold, Zora, OpenBlock Labs",
    dates: "June 2022 – Present",
  },
  {
    company: "Entropy Cryptography",
    role: "Software Engineer",
    dates: "December 2023 – January 2024",
  },
  {
    company: "Comm",
    role: "Software Engineer",
    dates: "October 2021 – June 2022",
  },
  {
    company: "Maple",
    role: "Software Engineer",
    dates: "October 2020 – September 2021",
  },
  {
    company: "WeWork",
    role: "Software Engineer",
    dates: "March 2019 – September 2020",
  },
  {
    company: "Freelance Software Engineer",
    role: "LedgerX, Zeel Networks, Rose Digital",
    dates: "June 2018 – March 2019",
  },
  {
    company: "Dexter",
    role: "Software Engineer",
    dates: "May 2017 – May 2018",
  },
];

export function PastWorkSection() {
  return (
    <section
      aria-labelledby="past-work-heading"
      className={cn(
        "col-span-full mt-12 grid grid-cols-subgrid pt-6 min-[72rem]:items-baseline",
        "border-t border-[color-mix(in_srgb,currentColor_18%,transparent)]",
      )}
    >
      <Heading
        id="past-work-heading"
        variant="section"
        className="mb-4 md:col-span-full min-[72rem]:col-[1]"
      >
        Past work
      </Heading>
      <ul
        className={cn(
          "col-span-full m-0 grid grid-cols-subgrid p-0 min-[72rem]:col-[2/-1]",
          "list-none",
        )}
      >
        {pastWork.map((work) => (
          <li
            key={`${work.company}-${work.dates}`}
            className={cn(
              "col-span-full grid grid-cols-subgrid items-baseline gap-y-1.5 py-5 min-[72rem]:first:pt-0",
              "[&+li]:border-t [&+li]:border-[color-mix(in_srgb,currentColor_12%,transparent)]",
              "focus-within:bg-[color-mix(in_srgb,var(--color-ink)_4%,transparent)]",
              "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-[color-mix(in_srgb,var(--color-ink)_4%,transparent)]",
              "motion-safe:transition-[background-color] motion-safe:duration-[160ms] motion-safe:ease-[ease]",
            )}
          >
            <Heading as="h3" variant="item">
              {work.company}
            </Heading>
            <Text variant="small">{work.role}</Text>
            <Text variant="date" className="md:text-right">
              {work.dates}
            </Text>
            {work.company === "Treasure It" ? (
              <div
                className={cn(
                  "col-span-full grid grid-cols-subgrid items-center gap-y-6 pt-5 pb-2",
                  "md:grid-cols-[minmax(0,20.75rem)_minmax(0,1fr)] md:gap-x-8",
                )}
              >
                <Link
                  className={cn(
                    "group/project flex flex-col items-center justify-center p-4",
                    "bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)] text-inherit no-underline",
                    focusRing,
                  )}
                  href="/images/treasure-it.png"
                  prefetch={false}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Image
                    className={cn(
                      "block h-auto w-[18.75rem] max-w-full",
                      "rounded-[0.75rem] object-contain",
                    )}
                    src="/images/treasure-it.png"
                    alt="Treasure It app showing a local giveaway with available and taken items"
                    width={403}
                    height={874}
                    sizes="(min-width: 72rem) 300px, (min-width: 48rem) 40vw, (max-width: 360px) 80vw, 300px"
                  />
                  <Typography
                    variant="screenshotCaption"
                    className={cn(
                      "mt-2 flex min-h-11 items-center",
                      "underline decoration-[color-mix(in_srgb,currentColor_40%,transparent)] decoration-1 underline-offset-[0.25em]",
                      "group-hover/project:decoration-current group-focus-visible/project:decoration-current",
                    )}
                  >
                    View full-size screenshot
                    <span className="sr-only"> (opens in a new tab)</span>
                  </Typography>
                </Link>
                <div>
                  <Text variant="metadata" className="max-w-[36ch]">
                    Selected work
                  </Text>
                  <Heading as="h4" variant="feature" className="mt-3 mb-6">
                    A second life for good things.
                  </Heading>
                  <Text className="mb-4 max-w-[36ch]">
                    A local marketplace for buying, selling, and giving things
                    nearby. Listings, offers, and scheduled pickups bring the
                    handoff into one place.
                  </Text>
                  <Link className={featureLink} href="https://treasureit.fun">
                    Explore Treasure It
                  </Link>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
