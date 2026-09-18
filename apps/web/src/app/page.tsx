import Link from "next/link";
import styles from "./home.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <h1>Benjamin Schachter</h1>
      <p>A code garden for software, systems, and experiments.</p>
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
