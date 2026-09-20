"use client";

import { Button } from "@personal-site/ui/components/button";
import { Eyebrow } from "@personal-site/ui/components/eyebrow";
import { Input } from "@personal-site/ui/components/input";
import {
  Heading,
  Text,
  Typography,
} from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import article from "../blog/[slug]/article-styles";
import journal from "../blog/index-styles";
import forces from "../experiments/forces/forces-styles";
import noise from "../experiments/perlin-noise/perlin-noise-styles";
import vector from "../experiments/vector-math/vector-math-styles";
import particles from "../experiments/wasm-canvas/wasm-canvas-styles";

const contexts = [
  { name: "Reference", page: "", container: "" },
  {
    name: "Particle controls",
    page: particles.page,
    container: particles.controls,
  },
  { name: "Noise controls", page: noise.page, container: noise.controls },
  {
    name: "Vector controls",
    page: vector.page,
    container: vector.activeMethod,
  },
  { name: "Forces controls", page: forces.page, container: forces.actions },
  { name: "Journal", page: journal.page, container: journal.postList },
  {
    name: "Article prose",
    page: cn(article.page, "ui-article-typography"),
    container: cn(article.prose, "ui-article-prose"),
  },
];
const properties = [
  "height",
  "min-height",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-bottom",
  "border-radius",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "color",
  "background-color",
  "--muted",
  "--accent",
];

function Samples() {
  return (
    <section
      className="grid w-64 max-w-full gap-4 font-sans text-base leading-normal text-foreground"
      data-boundary-sample="boundary-root"
      data-prose-exclude
    >
      <Button data-boundary-sample="button">Shared button</Button>
      <Input
        aria-label="Shared input"
        data-boundary-sample="input"
        placeholder="Shared input"
      />
      <Heading variant="item" data-boundary-sample="heading">
        Shared heading
      </Heading>
      <Text variant="small" data-boundary-sample="text">
        Shared paragraph
      </Text>
      <Eyebrow className="mb-4" data-boundary-sample="eyebrow">
        Caller spacing
      </Eyebrow>
      <Typography as="p" data-boundary-sample="inherited">
        An unstyled paragraph inside the exclusion boundary.
      </Typography>
      <a href="#fixture-title" data-boundary-sample="link">
        Component-owned link
      </a>
      <pre className="whitespace-pre-wrap" data-boundary-sample="pre">
        <code>Component-owned code</code>
      </pre>
      <div className="h-4 bg-muted" data-boundary-sample="muted" />
      <div className="h-4 bg-accent" data-boundary-sample="accent" />
    </section>
  );
}

export function StyleBoundaryFixture() {
  const root = useRef<HTMLDivElement>(null);
  const [failures, setFailures] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      const host = root.current;
      if (!host || cancelled) return;
      const groups = [
        ...host.querySelectorAll<HTMLElement>("[data-boundary-context]"),
      ];
      const reference = groups[0];
      if (!reference) return;
      const errors: string[] = [];
      for (const group of groups.slice(1)) {
        for (const sample of group.querySelectorAll<HTMLElement>(
          "[data-boundary-sample]",
        )) {
          const name = sample.dataset.boundarySample;
          const baseline = reference.querySelector(
            `[data-boundary-sample="${name}"]`,
          );
          if (!baseline) continue;
          const expected = getComputedStyle(baseline);
          const actual = getComputedStyle(sample);
          for (const property of properties) {
            if (
              actual.getPropertyValue(property) !==
              expected.getPropertyValue(property)
            ) {
              errors.push(
                `${group.dataset.boundaryContext} / ${name} / ${property}: ${actual.getPropertyValue(property)} (expected ${expected.getPropertyValue(property)})`,
              );
            }
          }
        }
      }
      const authored = host.querySelector("[data-authored-heading]");
      if (
        authored &&
        Number.parseFloat(getComputedStyle(authored).marginTop) === 0
      ) {
        errors.push("Authored article heading lost its prose spacing");
      }
      setFailures(errors);
    };
    void document.fonts.ready.then(check);
    window.addEventListener("resize", check);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <div
      ref={root}
      data-ui-theme="light"
      className="bg-background p-6 text-foreground"
    >
      <h1 id="fixture-title" className="text-2xl font-semibold">
        Style boundary integration fixture
      </h1>
      <p className="my-4">
        Actual app wrappers with identical shared components. The embedded UI
        explicitly owns its inherited font and opts out of authored prose.
      </p>
      <output
        data-style-boundary-result={
          failures === null ? "pending" : failures.length ? "fail" : "pass"
        }
        className="block whitespace-pre-wrap font-mono text-sm"
      >
        {failures === null
          ? "Checking computed styles…"
          : failures.length
            ? failures.join("\n")
            : "PASS: all shared component styles match the reference in every page context."}
      </output>
      <div className="mt-6 grid gap-6">
        {contexts.map(({ name, page, container }) => (
          <section
            key={name}
            className={cn(page, "min-h-0 p-6")}
            data-boundary-context={name}
          >
            <h2 className="mb-6 font-sans text-lg font-semibold">{name}</h2>
            <div className={cn(container, "m-0 block p-0")}>
              <Samples />
              {name === "Article prose" ? (
                <h2 data-authored-heading>
                  Authored Markdown keeps its typography and spacing
                </h2>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
