import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { layoutWarnings, toSvg } from "giotto/render";
import { frameAt, sceneWarnings, timeline } from "giotto/scenes";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimatedDiagram } from "./animated-diagram";

const directory = new URL("../../../public/diagrams/", import.meta.url);
for (const file of readdirSync(directory).filter((name) =>
  name.endsWith(".json"),
)) {
  test(`${file}: valid connections, scenes and rendered packet frames`, () => {
    const doc = JSON.parse(readFileSync(new URL(file, directory), "utf8"));
    const ids = doc.elements.map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const element of doc.elements.filter(
      (element) => element.type === "arrow",
    )) {
      expect(ids).toContain(element.start.id);
      expect(ids).toContain(element.end.id);
    }
    expect(sceneWarnings(doc)).toEqual([]);
    expect(layoutWarnings(doc)).toEqual([]);
    expect(doc.scenes.length).toBeGreaterThanOrEqual(2);
    const times = timeline(doc);
    for (const [index, scene] of times.scenes.entries()) {
      expect(scene.beats.length).toBeGreaterThan(0);
      for (const beat of scene.beats) {
        expect(beat.say.length).toBeGreaterThan(0);
        const frame = frameAt(doc, index, beat.start + beat.ms * 0.35, times);
        expect(frame.active.length).toBeGreaterThan(0);
        const svg = toSvg(doc, undefined, { frame });
        expect(svg).toContain("g-active");
        expect(svg).not.toContain("NaN");
      }
    }
  });
}

test("server rendering retains the description without browser APIs", () => {
  const html = renderToStaticMarkup(
    createElement(AnimatedDiagram, {
      src: "/diagrams/snap-to-post-identification.json",
      title: "Capture to listing",
      description:
        "Images enter the API; research updates follow over WebSocket.",
    }),
  );
  expect(html).toContain(
    "Images enter the API; research updates follow over WebSocket.",
  );
  expect(html).toContain("data-prose-exclude");
  expect(html).not.toContain("<giotto-player");
});
