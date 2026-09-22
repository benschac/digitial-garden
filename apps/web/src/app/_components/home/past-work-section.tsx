import { Heading, Text } from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";

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
          </li>
        ))}
      </ul>
    </section>
  );
}
