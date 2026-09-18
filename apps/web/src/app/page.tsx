import Link from "next/link";
import styles from "./home.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <h1>Benjamin Schachter</h1>
      <p>A code garden for software, systems, and experiments.</p>
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
      <nav aria-label="Primary" className={styles.links}>
        <a href="https://www.youtube.com/watch?v=UIBd0D4ny78&t=26s">
          Watch my App.js Conf 2026 talk →
        </a>
        {process.env.NODE_ENV === "development" ? (
          <Link href="/s">Talk to the workbench analyst →</Link>
        ) : null}
        <Link href="/blog">Read the blog →</Link>
        <Link href="/playground">Playground →</Link>
      </nav>
    </main>
  );
}
