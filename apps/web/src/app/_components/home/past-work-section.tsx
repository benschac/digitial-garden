import { Heading, Text } from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import Image from "next/image";

const pastWork = [
  {
    company: "Treasure It",
    dates: "March 2025 – Present",
    logo: "/images/work/treasure-it.png",
    role: "Founder / Software Engineer",
  },
  {
    company: "Freelance Software Engineer",
    dates: "June 2022 – Present",
    logo: "/images/benschac.svg",
    role: "Tenfold, Zora, OpenBlock Labs",
  },
  {
    company: "Recurse Center",
    dates: "July 1 – August 9, 2024",
    logo: "/images/work/recurse-center.jpg",
    role: "Participant Summer 2 ’24 (half batch)",
  },
  {
    company: "Entropy Cryptography",
    dates: "December 2022 – January 2024",
    logo: "/images/work/entropy.png",
    role: "Software Engineer",
  },
  {
    company: "Comm",
    dates: "October 2021 – June 2022",
    logo: "/images/work/comm.jpg",
    role: "Software Engineer",
  },
  {
    company: "Maple",
    dates: "October 2020 – September 2021",
    logo: "/images/work/maple.jpg",
    role: "Software Engineer",
  },
  {
    company: "WeWork",
    dates: "March 2019 – September 2020",
    logo: "/images/work/wework.svg",
    role: "Software Engineer",
  },
  {
    company: "Freelance Software Engineer",
    dates: "June 2018 – March 2019",
    logo: "/images/benschac.svg",
    role: "LedgerX, Zeel Networks, Rose Digital",
  },
  {
    company: "Dexter",
    dates: "May 2017 – May 2018",
    logo: "/images/work/dexter.jpg",
    role: "Software Engineer",
  },
  {
    company: "Recurse Center",
    dates: "November 7, 2016 – February 9, 2017",
    logo: "/images/work/recurse-center.jpg",
    role: "Participant Winter 1 ’16",
  },
];

export const PastWorkSection = () => (
  <section
    aria-labelledby="past-work-heading"
    className={cn(
      "col-span-full mt-12 grid grid-cols-subgrid pt-6 min-[72rem]:items-baseline",
      "border-t border-[color-mix(in_srgb,currentColor_18%,transparent)]"
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
        "list-none"
      )}
    >
      {pastWork.map((work) => (
        <li
          key={`${work.company}-${work.dates}`}
          className={cn(
            "col-span-full grid grid-cols-subgrid items-center gap-y-1.5 py-5 min-[72rem]:first:pt-0",
            "[&+li]:border-t [&+li]:border-[color-mix(in_srgb,currentColor_12%,transparent)]"
          )}
        >
          <Heading
            as="h3"
            variant="item"
            className={cn(
              "flex items-center gap-2",
              "text-balance font-(family-name:--home-entry-font,var(--font-sans))"
            )}
          >
            <span
              aria-hidden="true"
              className="size-11 shrink-0 overflow-hidden rounded-[8px]"
            >
              {work.logo && (
                <Image
                  src={work.logo}
                  alt=""
                  width={44}
                  height={44}
                  sizes="44px"
                  className="size-11 object-contain"
                />
              )}
            </span>
            <span>{work.company}</span>
          </Heading>
          <Text variant="small" className="pl-13 md:pl-0">
            {work.role}
          </Text>
          <Text variant="date" className="pl-13 md:pl-0 md:text-right">
            {work.dates}
          </Text>
        </li>
      ))}
    </ul>
  </section>
);
