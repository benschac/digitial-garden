import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

import { Schema } from "effect";
import { layoutWarnings, toSvg } from "giotto/render";
import { frameAt, sceneWarnings, timeline } from "giotto/scenes";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AnimatedDiagram, decodeDiagramDocument } from "./animated-diagram";

const isDiagramFixture = Schema.is(
  Schema.Struct({
    elements: Schema.Array(
      Schema.Struct({
        end: Schema.optional(Schema.Struct({ id: Schema.String })),
        id: Schema.String,
        start: Schema.optional(Schema.Struct({ id: Schema.String })),
        type: Schema.String,
      })
    ),
    scenes: Schema.Array(
      Schema.Struct({
        beats: Schema.optional(
          Schema.Array(Schema.Struct({ say: Schema.optional(Schema.String) }))
        ),
      })
    ),
  })
);

const parseJson = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Unknown)
);

const directory = new URL("../../../public/diagrams/", import.meta.url);

for (const file of readdirSync(directory).filter((name) =>
  name.endsWith(".json")
)) {
  test(`${file}: valid connections, scenes and rendered packet frames`, () => {
    const doc = parseJson(readFileSync(new URL(file, directory), "utf-8"));

    if (!isDiagramFixture(doc)) {
      throw new Error(`Invalid diagram fixture: ${file}`);
    }

    const ids = doc.elements.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const element of doc.elements.filter(
      (item) => item.type === "arrow"
    )) {
      if (element.start === undefined || element.end === undefined) {
        throw new Error(`Arrow ${element.id} must define both endpoints`);
      }

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
        expect(beat.say?.length ?? 0).toBeGreaterThan(0);
        const frame = frameAt(doc, index, beat.start + beat.ms * 0.35, times);

        if (frame === null) {
          throw new Error("Expected a frame for the existing scene");
        }

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
      description:
        "Images enter the API; research updates follow over WebSocket.",
      src: "/diagrams/snap-to-post-identification.json",
      title: "Capture to listing",
    })
  );

  expect(html).toContain(
    "Images enter the API; research updates follow over WebSocket."
  );
  expect(html).toContain("data-prose-exclude");
  expect(html).not.toContain("<giotto-player");
});

test("validates the document boundary without discarding Giotto fields", () => {
  const document = {
    custom: { value: 1 },
    elements: [],
    scenes: [{ title: "Example" }],
  };

  expect(decodeDiagramDocument(document)).toEqual(document);
  expect(() => decodeDiagramDocument({ elements: "invalid" })).toThrow();
  expect(() => decodeDiagramDocument(null)).toThrow();
});
