import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { EffectWalkthrough } from "./effect-walkthrough";
import { effectWalkthroughs } from "./effect-walkthrough-data";

test("server renders each walkthrough's first step without browser resources", () => {
  for (const kind of [
    "factory",
    "coalescing",
    "cancellation",
    "cleanup",
  ] as const) {
    const markup = renderToStaticMarkup(<EffectWalkthrough kind={kind} />);
    const walkthrough = effectWalkthroughs[kind];

    expect(markup).toContain(walkthrough.title);
    expect(markup).toContain(renderToStaticMarkup(walkthrough.steps[0].detail));
  }
});
