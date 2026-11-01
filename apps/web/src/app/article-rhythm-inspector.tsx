"use client";

import {
  useAnimationFrame,
  useResizeObserver,
  useWindowEvent,
} from "@personal-site/react-hooks";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useEditorialFontPreference } from "./editorial-font-preference";
import { InspectorSelect } from "./typography-inspector-select";

import styles from "./typography-inspector.module.css";

const { parseFloat: parseCssNumber } = Number;

interface Gap {
  key: string;
  top: number;
  left: number;
  height: number;
  label: string;
}

type SpacingScale = "editorial" | "golden" | "grid4" | "grid8" | "fluid";

type RhythmPreset =
  | Exclude<SpacingScale, "editorial">
  | "current"
  | "compact"
  | "airy"
  | "custom";

const phi = (1 + Math.sqrt(5)) / 2;

const presetNotes: Record<RhythmPreset, string> = {
  airy: "An editorial variation with more breathing room: body line spacing at 1.65× text size and 20% larger block gaps.",
  compact:
    "An editorial variation for denser pages: body line spacing at 1.50× text size and 20% smaller block gaps.",
  current:
    "The current blog design and recommended starting point for long posts: body line spacing at 1.55× text size, with generous section breaks and closer heading-to-text gaps.",
  custom: "Custom: your slider adjustments. Select a preset to compare again.",
  fluid:
    "Responsive spacing: paragraph gaps grow smoothly from 18px at a 360px viewport to 28px at 1440px. Groups and sections use larger multiples; body line spacing stays at 1.55× text size.",
  golden:
    "A proportional experiment: body line spacing at 1.618× text size. Paragraph, group and section gaps use 1, 1.618 and 2.618× body text size.",
  grid4:
    "A compact 4px spacing recipe: 20px between paragraphs, 32px around grouped content, and 48px before major sections. Body line spacing stays at 1.55× text size.",
  grid8:
    "A roomier 8px spacing recipe: 24px between paragraphs, 40px around grouped content, and 64px before major sections. Body line spacing stays at 1.55× text size.",
};

const presetComparisons = [
  ["Editorial", "1.55×", "Current blog spacing"],
  ["Editorial compact", "1.50×", "20% smaller gaps"],
  ["Editorial airy", "1.65×", "20% larger gaps"],
  ["Golden ratio", "1.618×", "Proportional scale"],
  ["4px spacing grid", "1.55×", "20px paragraphs · 48px sections"],
  ["8px spacing grid", "1.55×", "24px paragraphs · 64px sections"],
  ["Fluid spacing", "1.55×", "Grows with viewport"],
] as const;

// Explicit recipes make grid previews distinct even when existing gaps already
// land on both grids. Only positive owned margins change; component internals stay intact.
const gridSpacing = {
  grid4: {
    group: 32,
    h2After: 16,
    h2Before: 48,
    h3After: 12,
    h3Before: 32,
    h4After: 8,
    h4Before: 24,
    paragraph: 20,
  },
  grid8: {
    group: 40,
    h2After: 24,
    h2Before: 64,
    h3After: 16,
    h3Before: 40,
    h4After: 16,
    h4Before: 32,
    paragraph: 24,
  },
} as const;

const leadingTokens = [
  "--blog-leading-heading",
  "--blog-leading-body",
  "--blog-leading-deck",
] as const;

const rhythmBlocks = (article: HTMLElement) => [
  ...article.querySelectorAll<HTMLElement>(
    ":scope > header > h1, :scope > header > p, :scope > .ui-article-prose > *"
  ),
];

const presetLeading: Partial<Record<RhythmPreset, number>> = {
  airy: 1.65,
  compact: 1.5,
  golden: phi,
};

const presetSpacing: Partial<Record<RhythmPreset, number>> = {
  airy: 1.2,
  compact: 0.8,
};

const isGroupedBlock = (tag: string) =>
  [
    "H3",
    "H4",
    "FIGURE",
    "ASIDE",
    "PRE",
    "SECTION",
    "TABLE",
    "UL",
    "OL",
  ].includes(tag);

interface BlockSpacing {
  baseBottom: number;
  baseTop: number;
  element: HTMLElement;
}

interface SpacingRecipe {
  bodySize: number;
  fluidBase: number;
  scale: SpacingScale;
  spacing: number;
}

const blockSpacing = (margin: BlockSpacing, recipe: SpacingRecipe) => {
  const tag = margin.element.tagName;
  const grouped = isGroupedBlock(tag);
  const isHeading = /^H[234]$/u.test(tag);
  let before = margin.baseTop;
  let after = margin.baseBottom;

  if (recipe.scale === "golden") {
    const groupMultiplier = grouped ? phi : 1;
    const multiplier = tag === "H2" ? phi ** 2 : groupMultiplier;
    before = recipe.bodySize * multiplier;
    after = isHeading ? recipe.bodySize / phi : before;
  } else if (recipe.scale === "grid4" || recipe.scale === "grid8") {
    const grid = gridSpacing[recipe.scale];

    const headings = new Map([
      ["H2", [grid.h2Before, grid.h2After]],
      ["H3", [grid.h3Before, grid.h3After]],
      ["H4", [grid.h4Before, grid.h4After]],
    ]);

    const fallback = grouped || tag === "H1" ? grid.group : grid.paragraph;
    [before, after] = headings.get(tag) ?? [fallback, fallback];
  } else if (recipe.scale === "fluid") {
    const groupMultiplier = grouped ? 1.5 : 1;
    before = recipe.fluidBase * (tag === "H2" ? 2.5 : groupMultiplier);

    const headingAfter = new Map([
      ["H2", 0.75],
      ["H3", 0.5],
      ["H4", 0.5],
    ]);

    after = recipe.fluidBase * (headingAfter.get(tag) ?? (grouped ? 1.5 : 1));
  }

  return {
    bottom:
      (margin.baseBottom > 0 ? after : margin.baseBottom) * recipe.spacing,
    top: (margin.baseTop > 0 ? before : margin.baseTop) * recipe.spacing,
  };
};

interface SavedToken {
  token: string;
  inline: string;
  priority: string;
}

interface SavedMargin {
  element: HTMLElement;
  top: string;
  topPriority: string;
  bottom: string;
  bottomPriority: string;
}

const restoreRhythm = (
  root: HTMLElement,
  title: HTMLElement | null,
  titleLeading: string,
  titlePriority: string,
  tokens: SavedToken[],
  margins: SavedMargin[]
) => {
  for (const token of tokens) {
    if (token.inline) {
      root.style.setProperty(token.token, token.inline, token.priority);
    } else {
      root.style.removeProperty(token.token);
    }
  }

  if (title) {
    if (titleLeading) {
      title.style.setProperty("line-height", titleLeading, titlePriority);
    } else {
      title.style.removeProperty("line-height");
    }
  }

  for (const margin of margins) {
    if (margin.top) {
      margin.element.style.setProperty(
        "margin-top",
        margin.top,
        margin.topPriority
      );
    } else {
      margin.element.style.removeProperty("margin-top");
    }

    if (margin.bottom) {
      margin.element.style.setProperty(
        "margin-bottom",
        margin.bottom,
        margin.bottomPriority
      );
    } else {
      margin.element.style.removeProperty("margin-bottom");
    }
  }
};

const captureTitleRhythm = (article: HTMLElement) => {
  const title = article.querySelector<HTMLElement>("h1");
  const titleLeading = title?.style.getPropertyValue("line-height") ?? "";
  const titlePriority = title?.style.getPropertyPriority("line-height") ?? "";
  const titleCss = title ? getComputedStyle(title) : undefined;

  const titleRatio = titleCss
    ? parseCssNumber(titleCss.lineHeight) / parseCssNumber(titleCss.fontSize)
    : 1;

  return { title, titleLeading, titlePriority, titleRatio };
};

export const ArticleRhythmInspector = ({
  onChange,
  showGaps,
  onShowGapsChange,
}: {
  onChange: () => void;
  showGaps: boolean;
  onShowGapsChange: (enabled: boolean) => void;
}) => {
  const { displayFont, readingFont } = useEditorialFontPreference();
  const [preset, setPreset] = useState<RhythmPreset>("current");
  const [spacingScale, setSpacingScale] = useState<SpacingScale>("editorial");
  const [nestedGaps, setNestedGaps] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [heading, setHeading] = useState(1);
  const [body, setBody] = useState(1);
  const [spacing, setSpacing] = useState(1);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [css, setCss] = useState("");
  const pendingCss = useRef("");
  const id = useId();
  const articleRef = useRef<HTMLElement | null>(null);

  const { requestFrame } = useAnimationFrame(() => {
    setCss(pendingCss.current);

    const article = document.querySelector<HTMLElement>(
      ".ui-article-typography > article"
    );

    if (!article || !showGaps) {
      setGaps([]);

      return false;
    }

    const groups = [rhythmBlocks(article)];

    if (nestedGaps) {
      for (const container of article.querySelectorAll<HTMLElement>(
        "ul,ol,dl,blockquote,aside,figure,thead,tbody,[data-prose-exclude]"
      )) {
        groups.push(
          [...container.children].filter(
            (element): element is HTMLElement =>
              element instanceof HTMLElement &&
              !Object.hasOwn(element.dataset, "typographyProbe")
          )
        );
      }
    }

    const next: Gap[] = [];

    for (const [groupIndex, blocks] of groups.entries()) {
      for (let index = 1; index < blocks.length; index += 1) {
        const previous = blocks[index - 1].getBoundingClientRect();
        const current = blocks[index].getBoundingClientRect();
        const height = current.top - previous.bottom;

        const overlap =
          Math.min(previous.right, current.right) -
          Math.max(previous.left, current.left);

        if (
          overlap > 0 &&
          height >= -1 &&
          current.top > 0 &&
          previous.bottom < window.innerHeight
        ) {
          next.push({
            height: Math.max(0, height),
            key: `${groupIndex}-${index}-${blocks[index].tagName}`,
            label: `${Math.max(0, height).toFixed(1)}px${groupIndex ? " · inside" : ""}`,
            left: Math.min(previous.left, current.left) - 10,
            top: previous.bottom,
          });
        }
      }
    }

    setGaps(next);

    return false;
  });

  useWindowEvent("scroll", requestFrame, true);
  useWindowEvent("resize", () => {
    setViewportWidth(window.innerWidth);
    requestFrame();
  });

  useEffect(() => {
    const article = document.querySelector<HTMLElement>(
      ".ui-article-typography > article"
    );

    articleRef.current = article;
    const root = article?.closest<HTMLElement>(".ui-article-typography");

    if (!article || !root) {
      return;
    }

    const rootCss = getComputedStyle(root);

    const tokens = leadingTokens.map((token) => ({
      base: parseCssNumber(rootCss.getPropertyValue(token)),
      inline: root.style.getPropertyValue(token),
      priority: root.style.getPropertyPriority(token),
      token,
    }));

    const { title, titleLeading, titlePriority, titleRatio } =
      captureTitleRhythm(article);

    // Parent/outer block spacing only: never reach into embedded components.
    const blocks = [
      ...rhythmBlocks(article),
      ...article.querySelectorAll<HTMLElement>(":scope > .ui-article-prose"),
    ];

    const margins = blocks.map((element) => {
      const computed = getComputedStyle(element);

      return {
        baseBottom: parseCssNumber(computed.marginBottom),
        baseTop: parseCssNumber(computed.marginTop),
        bottom: element.style.getPropertyValue("margin-bottom"),
        bottomPriority: element.style.getPropertyPriority("margin-bottom"),
        element,
        top: element.style.getPropertyValue("margin-top"),
        topPriority: element.style.getPropertyPriority("margin-top"),
      };
    });

    const bodySize = parseCssNumber(
      getComputedStyle(
        article.querySelector<HTMLElement>(".ui-article-prose > p") ?? article
      ).fontSize
    );

    const rules: string[] = [
      `/* Rhythm preset: ${preset}. Spacing scale: ${spacingScale}. Font preferences: ${displayFont} / ${readingFont}; viewport ${viewportWidth || window.innerWidth}px. */`,
      "/* Optional rhythm overrides. Add these classes only to the article and its owned blocks.\n * Spacing is a viewport snapshot; adapt to the page's responsive tokens before publishing.\n * Remove the classes to restore existing CSS. */",
    ];

    if (heading !== 1 || body !== 1) {
      const declarations: string[] = [];

      for (const token of tokens) {
        const multiplier =
          token.token === "--blog-leading-heading" ? heading : body;

        if (multiplier === 1 || !Number.isFinite(token.base)) {
          continue;
        }

        const value = (token.base * multiplier).toFixed(4);
        root.style.setProperty(token.token, value);
        declarations.push(`  ${token.token}: ${value};`);
      }

      rules.push(`.article-rhythm {\n${declarations.join("\n")}\n}`);

      if (title && heading !== 1) {
        title.style.setProperty("line-height", String(titleRatio * heading));
        rules.push(
          `.article-title-rhythm { line-height: ${(titleRatio * heading).toFixed(4)}; }`
        );
      }
    }

    if (spacing !== 1 || spacingScale !== "editorial") {
      const fluidProgress = Math.min(
        1,
        Math.max(0, (window.innerWidth - 360) / (1440 - 360))
      );

      const fluidBase = 18 + 10 * fluidProgress;

      for (const [index, margin] of margins.entries()) {
        const { top, bottom } = blockSpacing(margin, {
          bodySize,
          fluidBase,
          scale: spacingScale,
          spacing,
        });

        margin.element.style.setProperty("margin-top", `${top}px`);
        margin.element.style.setProperty("margin-bottom", `${bottom}px`);
        rules.push(
          `/* ${margin.element.tagName.toLowerCase()}: ${margin.element.textContent?.trim().slice(0, 45).replaceAll("*/", "")} */\n.article-spacing-${index + 1} { margin-top: ${top.toFixed(2)}px; margin-bottom: ${bottom.toFixed(2)}px; }`
        );
      }
    }

    pendingCss.current = rules.join("\n\n");
    onChange();
    requestFrame();

    return () =>
      restoreRhythm(root, title, titleLeading, titlePriority, tokens, margins);
  }, [
    preset,
    spacingScale,
    heading,
    body,
    spacing,
    displayFont,
    readingFont,
    viewportWidth,
    onChange,
    requestFrame,
  ]);

  useResizeObserver(articleRef, requestFrame);
  // checkbox changes invalidate the latest frame callback
  useEffect(() => {
    requestFrame();
  }, [showGaps, nestedGaps, requestFrame]);

  return (
    <section aria-label="Vertical rhythm">
      <strong>Vertical rhythm</strong>
      <div className={styles.rhythm}>
        <label className={styles.label} htmlFor={`${id}-preset`}>
          Spacing preset
          <InspectorSelect
            id={`${id}-preset`}
            value={preset}
            onChange={(event) => {
              const next = event.target.value as RhythmPreset;
              setPreset(next);
              setSpacingScale(
                next === "golden" ||
                  next === "grid4" ||
                  next === "grid8" ||
                  next === "fluid"
                  ? next
                  : "editorial"
              );
              setHeading(1);

              const root = articleRef.current?.closest(
                ".ui-article-typography"
              );

              // Read the unmodified ratio; the active preview is restored by effect cleanup.
              const currentRatio = root
                ? parseCssNumber(
                    getComputedStyle(root).getPropertyValue(
                      "--blog-leading-body"
                    )
                  ) / body
                : 1.55;

              const leading = presetLeading[next] ?? currentRatio;

              setBody(leading / currentRatio);
              setSpacing(presetSpacing[next] ?? 1);
            }}
          >
            <optgroup label="Editorial variations">
              <option value="current">Editorial · recommended</option>
              <option value="compact">Editorial compact</option>
              <option value="airy">Editorial airy</option>
            </optgroup>
            <optgroup label="Spacing systems">
              <option value="golden">Golden ratio · 1.618</option>
              <option value="grid4">4px spacing grid</option>
              <option value="grid8">8px spacing grid</option>
              <option value="fluid">Fluid spacing · responsive</option>
            </optgroup>
            <option value="custom" disabled>
              Custom sliders
            </option>
          </InspectorSelect>
        </label>
        <p className={styles.note} aria-live="polite">
          {presetNotes[preset]}
        </p>
        <details>
          <summary>Compare spacing presets</summary>
          <div className={styles.rhythm}>
            <p className={styles.note}>
              Body line spacing is the distance between text baselines, shown as
              a multiple of text size. Block gaps separate paragraphs, headings
              and other content. All presets keep heading line spacing. The grid
              options align gaps, not every text baseline.
            </p>
            <table
              className={styles.table}
              aria-label="Spacing preset comparison"
            >
              <thead>
                <tr>
                  <th className={styles.cell} scope="col">
                    Preset
                  </th>
                  <th className={styles.cell} scope="col">
                    Body lines
                  </th>
                  <th className={styles.cell} scope="col">
                    Block spacing
                  </th>
                </tr>
              </thead>
              <tbody>
                {presetComparisons.map(([name, leading, gapDescription]) => (
                  <tr key={name}>
                    <th className={styles.cell} scope="row">
                      {name}
                    </th>
                    <td className={styles.cell}>{leading}</td>
                    <td className={styles.cell}>{gapDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.note}>
              Editorial is the balanced default. Compact suits a denser layout;
              Airy gives sections more room. The 4px and 8px grids offer
              familiar spacing steps, while Fluid adapts to the screen. Golden
              ratio is another starting point to judge by eye.
            </p>
          </div>
        </details>
        <p className={styles.note}>
          Close Typography hides the controls and keeps your spacing, trim and
          overlay selections. Reopen to keep adjusting; Reset preview restores
          the article defaults.
        </p>
        <label className={styles.row}>
          <input
            type="checkbox"
            checked={showGaps}
            onChange={(event) => {
              onShowGapsChange(event.target.checked);
              requestFrame();
            }}
          />{" "}
          Show spacing between article blocks
        </label>
        <button
          type="button"
          onClick={() => {
            setPreset("current");
            setSpacingScale("editorial");
            setHeading(1);
            setBody(1);
            setSpacing(1);
          }}
        >
          Reset to editorial default
        </button>
        <details>
          <summary>Fine-tune spacing and overlays</summary>
          <div className={styles.rhythm}>
            <p className={styles.note}>
              Leading controls change spacing between lines. Block spacing
              includes headings, paragraphs, lists, tables, code and figures.
            </p>
            {(
              [
                ["Heading leading", heading, setHeading, "heading"],
                ["Body and deck leading", body, setBody, "body"],
                ["Space between blocks", spacing, setSpacing, "spacing"],
              ] as const
            ).map(([label, value, setter, key]) => (
              <label
                key={key}
                className={styles.label}
                htmlFor={`${id}-${key}`}
              >
                {label} · {value.toFixed(2)}× existing CSS
                <input
                  id={`${id}-${key}`}
                  type="range"
                  min={key === "spacing" ? 0.5 : 0.8}
                  max="1.5"
                  step="0.02"
                  value={value}
                  onChange={(event) => {
                    setPreset("custom");
                    setter(Number(event.target.value));
                  }}
                />
              </label>
            ))}
            <label className={styles.row}>
              <input
                type="checkbox"
                checked={nestedGaps}
                onChange={(event) => setNestedGaps(event.target.checked)}
              />
              Include spacing inside lists, tables, notes and figures
            </label>
            <p className={styles.note}>
              Gap labels measure DOM block edges, including collapsed margins.
              They are separate from font guides and glyph ink.
            </p>
            <textarea
              aria-label="Exported rhythm CSS"
              className={styles.css}
              readOnly
              value={css}
            />
          </div>
        </details>
      </div>
      {showGaps
        ? createPortal(
            <div
              className={styles.overlay}
              aria-hidden="true"
              data-article-spacing-overlay=""
            >
              {gaps.map((gap) => (
                <div
                  key={gap.key}
                  className={styles.gap}
                  style={{ height: gap.height, left: gap.left, top: gap.top }}
                >
                  <span className={styles.gapLabel}>{gap.label}</span>
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </section>
  );
};
