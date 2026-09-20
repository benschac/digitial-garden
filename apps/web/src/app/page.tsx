import Image from "next/image";
import Link from "next/link";
import { PageTransition } from "@/app/_components/page-transition";
import styles from "./home.module.css";
import { InkHeading } from "./ink-heading";

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

export default function Home() {
  return (
    <PageTransition>
      <main className={`${styles.page} ${styles.homePage}`}>
        <header className={styles.masthead}>
          <InkHeading />
          <div className={styles.profileDetails}>
            <nav aria-label="Social profiles" className={styles.socialLinks}>
              <a href="https://github.com/benschac">
                <span className={styles.srOnly}>GitHub</span>
                <svg
                  aria-hidden="true"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .75a11.25 11.25 0 0 0-3.558 21.923c.563.104.768-.244.768-.542 0-.267-.01-.975-.015-1.914-3.13.68-3.791-1.51-3.791-1.51-.512-1.3-1.25-1.646-1.25-1.646-1.022-.699.078-.685.078-.685 1.13.08 1.724 1.16 1.724 1.16 1.004 1.72 2.634 1.223 3.276.935.102-.727.393-1.223.715-1.504-2.499-.284-5.126-1.25-5.126-5.565 0-1.23.44-2.234 1.16-3.022-.116-.285-.503-1.43.11-2.98 0 0 .945-.303 3.094 1.155A10.79 10.79 0 0 1 12 6.176c.956.005 1.918.129 2.816.379 2.148-1.458 3.091-1.155 3.091-1.155.615 1.55.228 2.695.112 2.98.722.788 1.158 1.792 1.158 3.022 0 4.326-2.631 5.278-5.138 5.557.404.348.766 1.034.766 2.084 0 1.504-.014 2.717-.014 3.086 0 .3.203.65.774.54A11.252 11.252 0 0 0 12 .75Z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/benjaminschachter/">
                <span className={styles.srOnly}>LinkedIn</span>
                <svg
                  aria-hidden="true"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.447 2H3.553C2.695 2 2 2.677 2 3.512v16.976C2 21.323 2.695 22 3.553 22h16.894C21.305 22 22 21.323 22 20.488V3.512C22 2.677 21.305 2 20.447 2ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.455 7.895a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42ZM19.02 18.75h-2.948v-4.645c0-1.108-.02-2.533-1.543-2.533-1.545 0-1.782 1.207-1.782 2.453v4.725H9.8V9.2h2.829v1.305h.04c.394-.748 1.356-1.537 2.79-1.537 2.986 0 3.561 1.965 3.561 4.52v5.262Z" />
                </svg>
              </a>
            </nav>
            <p className={styles.roleStatus}>
              <em>looking for my next role</em>
            </p>
          </div>
          <nav
            aria-label="Primary"
            className={`${styles.links} ${styles.mastheadLinks}`}
          >
            <a href="#featured-talk">Speaking</a>
            <Link href="/blog" transitionTypes={["nav-forward"]}>
              Blog
            </Link>
            <Link href="/playground" transitionTypes={["nav-forward"]}>
              Playground
            </Link>
            {process.env.NODE_ENV === "development" ? (
              <Link href="/s" transitionTypes={["nav-forward"]}>
                Talk to the workbench analyst
              </Link>
            ) : null}
          </nav>
        </header>
        <section
          id="featured-talk"
          aria-labelledby="featured-talk-heading"
          className={styles.featuredTalk}
        >
          <h2 id="featured-talk-heading">Speaking</h2>
          <a
            className={styles.talkFeature}
            href="https://www.youtube.com/watch?v=UIBd0D4ny78&t=26s"
          >
            <Image
              className={styles.talkImage}
              src="/images/appjs-talk.jpg"
              alt=""
              width={1280}
              height={720}
              sizes="(min-width: 80rem) 692px, (min-width: 72rem) 55vw, (min-width: 48rem) 65vw, 100vw"
            />
            <div className={styles.talkCopy}>
              <p className={styles.featureMeta}>App.js Conf · 2026</p>
              <h3>
                Emit Once,
                <br />
                Notify Anywhere
              </h3>
              <span className={styles.featureLink}>Watch the talk</span>
            </div>
          </a>
        </section>
        <section
          aria-labelledby="past-work-heading"
          className={styles.pastWork}
        >
          <h2 id="past-work-heading">Past work</h2>
          <ul className={styles.workList}>
            {pastWork.map((work) => (
              <li key={`${work.company}-${work.dates}`}>
                <h3>{work.company}</h3>
                <p className={styles.workRole}>{work.role}</p>
                <p className={styles.workDates}>{work.dates}</p>
                {work.company === "Treasure It" ? (
                  <div className={styles.projectDetail}>
                    <a
                      className={styles.projectImage}
                      href="/images/treasure-it.png"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Image
                        src="/images/treasure-it.png"
                        alt="Treasure It app showing a local giveaway with available and taken items"
                        width={403}
                        height={874}
                        sizes="(min-width: 72rem) 300px, (min-width: 48rem) 40vw, (max-width: 360px) 80vw, 300px"
                      />
                      <span className={styles.imageCaption}>
                        View full-size screenshot
                        <span className={styles.srOnly}>
                          {" "}
                          (opens in a new tab)
                        </span>
                      </span>
                    </a>
                    <div className={styles.projectCopy}>
                      <p className={styles.featureMeta}>Selected work</p>
                      <h4>A second life for good things.</h4>
                      <p>
                        A local marketplace for buying, selling, and giving
                        things nearby. Listings, offers, and scheduled pickups
                        bring the handoff into one place.
                      </p>
                      <a
                        className={styles.featureLink}
                        href="https://treasureit.fun"
                      >
                        Explore Treasure It
                      </a>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </PageTransition>
  );
}
