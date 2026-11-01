"use client";

import { useState } from "react";

import { AnimatedDiagram } from "@/components/mdx/animated-diagram";

export const DiagramFixture = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [missing, setMissing] = useState(false);
  const [mounted, setMounted] = useState(true);

  return (
    <main className="mx-auto max-w-3xl p-4 font-sans">
      <h1>Diagram integration checks</h1>
      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          Switch to {theme === "light" ? "dark" : "light"}
        </button>
        <button type="button" onClick={() => setMissing(!missing)}>
          {missing ? "Load diagram" : "Test missing file"}
        </button>
        <button type="button" onClick={() => setMounted(!mounted)}>
          {mounted ? "Unmount player" : "Mount player"}
        </button>
      </div>
      {mounted && (
        <AnimatedDiagram
          src={
            missing
              ? "/diagrams/missing.json"
              : "/diagrams/snap-to-post-identification.json"
          }
          title="One item, useful results along the way"
          description="Static fallback: local perception stays on the phone. Images and signals go to the API; the HTTP result precedes background research and WebSocket listing updates. Illustrative timing."
          theme={theme}
        />
      )}
    </main>
  );
};
