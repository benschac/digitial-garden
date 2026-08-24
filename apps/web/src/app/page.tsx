import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Benjamin Schachter</h1>
      <p>A personal workbench for software, systems, and experiments.</p>
      <Link href="/blog">Read the blog →</Link>
      <br />
      <Link href="/experiments/wasm-canvas">Explore WebGPU particles →</Link>
    </main>
  );
}
