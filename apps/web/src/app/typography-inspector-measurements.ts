import {
  createStyleString,
  getCapHeight,
  precomputeValues,
} from "@capsizecss/core";
import type { FontMetrics } from "@capsizecss/core";
import georgia from "@capsizecss/metrics/georgia";

import { requestTypographyMetrics } from "./typography-metric-requests";

import styles from "./typography-inspector.module.css";

const { parseFloat: parseCssNumber } = Number;

export type TrimMode = "original" | "capsize" | "native";

export const supportedTrimMode = (
  selectedMode: TrimMode,
  nativeSupported: boolean
): TrimMode =>
  selectedMode === "native" && !nativeSupported ? "original" : selectedMode;

export interface FontSource {
  metrics: FontMetrics;
  source: string;
  verified: boolean;
}

export interface Target {
  id: string;
  element: HTMLElement;
  label: string;
  font?: FontSource;
  issue?: string;
}

export interface LineMeasurement {
  baseline: number;
  left: number;
  width: number;
}

export interface BoxMeasurement {
  height: number;
  lines: LineMeasurement[];
}

const unquote = (value: string) => value.replaceAll(/^["']|["']$/gu, "");

// CSS Fonts weight matching, including the special 400–500 search order.
export const weightDistance = (weight: number, candidate: number) => {
  if (weight >= 400 && weight <= 500) {
    if (candidate >= weight && candidate <= 500) {
      return candidate - weight;
    }

    if (candidate < weight) {
      return 1000 + weight - candidate;
    }

    return 2000 + candidate - weight;
  }

  if (weight < 400) {
    return candidate <= weight ? weight - candidate : 1000 + candidate - weight;
  }

  return candidate >= weight ? candidate - weight : 1000 + weight - candidate;
};

const fontFaces = () => {
  const faces: CSSFontFaceRule[] = [];

  const visit = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSFontFaceRule) {
        faces.push(rule);
      } else if ("cssRules" in rule) {
        visit((rule as CSSGroupingRule).cssRules);
      }
    }
  };

  for (const sheet of document.styleSheets) {
    try {
      visit(sheet.cssRules);
    } catch {
      /* Cross-origin stylesheets are not inspectable. */
    }
  }

  return faces;
};

export const resolveFont = async (
  element: HTMLElement,
  signal: AbortSignal
): Promise<FontSource | undefined> => {
  const css = getComputedStyle(element);
  const family = unquote(css.fontFamily.split(",")[0].trim());
  const weight = parseCssNumber(css.fontWeight) || 400;

  const familyFaces = fontFaces().filter(
    (face) => unquote(face.style.fontFamily) === family
  );

  const matchingStyle = familyFaces.filter(
    (face) => (face.style.fontStyle || "normal") === css.fontStyle
  );

  // CSS synthesizes italics when a family supplies only upright faces.
  const candidates = matchingStyle.length
    ? matchingStyle
    : familyFaces.filter(
        (face) => (face.style.fontStyle || "normal") === "normal"
      );

  const faceWeight = (face: CSSFontFaceRule) => {
    const [min, max = min] = (face.style.fontWeight || "400")
      .split(" ")
      .map(Number);

    return Math.max(min, Math.min(max, weight));
  };

  candidates.sort(
    (a, b) =>
      weightDistance(weight, faceWeight(a)) -
      weightDistance(weight, faceWeight(b))
  );

  // For a split Google font, inspect the Latin asset rather than another subset.
  const nearest = candidates.filter(
    (face) => faceWeight(face) === faceWeight(candidates[0])
  );

  const face =
    nearest.find((candidate) =>
      /U\+0-FF/iu.test(candidate.style.getPropertyValue("unicode-range"))
    ) ?? nearest[0];

  const asset = face?.style
    .getPropertyValue("src")
    .match(/\/[^/"')]+\.(?:woff2?|otf|ttf)/u)?.[0]
    .slice(1);

  if (!asset) {
    // A catalog reference is useful, but is not proof of the installed OS font.
    return family === "Georgia"
      ? {
          metrics: georgia,
          source:
            "@capsizecss/metrics/georgia (system reference; installed file unverified)",
          verified: false,
        }
      : undefined;
  }

  const loaded = await document.fonts.load(
    `${css.fontStyle} ${css.fontWeight} ${css.fontSize} "${family}"`,
    element.textContent ?? "Hg"
  );

  if (
    signal.aborted ||
    !loaded.length ||
    loaded.some((font) => font.status !== "loaded")
  ) {
    return undefined;
  }

  return requestTypographyMetrics(
    process.env.NODE_ENV === "production"
      ? `/_next/static/typography-metrics/${encodeURIComponent(asset)}.json`
      : `/api/typography-metrics?asset=${encodeURIComponent(asset)}`,
    signal
  );
};

export const trimValues = (element: HTMLElement, metrics: FontMetrics) => {
  const css = getComputedStyle(element);
  const fontSize = parseCssNumber(css.fontSize);
  const leading = parseCssNumber(css.lineHeight);

  const options: Parameters<typeof precomputeValues>[0] = {
    fontMetrics: metrics,
    fontSize,
  };

  if (Number.isFinite(leading)) {
    return precomputeValues({ ...options, leading });
  }

  return precomputeValues(options);
};

export const clearTrim = (element: HTMLElement) => {
  element.classList.remove(styles.untrimmed, styles.capsize, styles.native);
  element.style.removeProperty("--inspector-cap-trim");
  element.style.removeProperty("--inspector-baseline-trim");
};

export const setTrim = (
  element: HTMLElement,
  mode: TrimMode,
  font?: FontSource
) => {
  if (mode === "original") {
    clearTrim(element);
    element.classList.add(styles.untrimmed);

    return;
  }

  if (!font?.verified) {
    clearTrim(element);

    return;
  }

  element.classList.remove(styles.untrimmed);
  const values = trimValues(element, font.metrics);
  element.style.setProperty("--inspector-cap-trim", values.capHeightTrim);
  element.style.setProperty("--inspector-baseline-trim", values.baselineTrim);
  element.classList.toggle(styles.capsize, mode === "capsize");
  element.classList.toggle(styles.native, mode === "native");
};

/**
 * Measure an offscreen clone so baseline probes never split React-owned text.
 * Range rectangles locate wrapped words; zero-height inline probes measure the
 * browser's baseline. These are line/layout measurements, never glyph ink bounds.
 */
export const measureBox = (
  element: HTMLElement,
  mode: TrimMode,
  font?: FontSource
): BoxMeasurement => {
  const css = getComputedStyle(element);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  clone.dataset.typographyProbe = "";
  clone.inert = true;

  for (const property of css) {
    clone.style.setProperty(property, css.getPropertyValue(property));
  }

  Object.assign(clone.style, {
    gridArea: "auto",
    height: "auto",
    left: "-10000px",
    margin: "0px",
    maxHeight: "none",
    minHeight: "0px",
    position: "fixed",
    top: "0px",
    transform: "none",
    visibility: "hidden",
    width: `${element.getBoundingClientRect().width}px`,
  });
  clone.style.setProperty("text-box-trim", "none");
  // Keep selectors, inherited custom properties and the article's theme context.
  element.parentElement?.append(clone);
  setTrim(clone, mode, font);

  if (mode === "native" && font?.verified) {
    clone.style.setProperty("text-box-trim", "trim-both");
    clone.style.setProperty("text-box-edge", "cap alphabetic");
  }

  try {
    const box = clone.getBoundingClientRect();
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);

    const starts: {
      node: Text;
      end: number;
      top: number;
      bottom: number;
      left: number;
      right: number;
    }[] = [];

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node as Text;

      for (const match of text.data.matchAll(/\S+/gu)) {
        const range = document.createRange();
        range.setStart(text, match.index);
        range.setEnd(text, match.index + match[0].length);

        for (const rect of range.getClientRects()) {
          if (!rect.width) {
            continue;
          }

          const line = starts.find(
            (candidate) =>
              Math.min(candidate.bottom, rect.bottom) -
                Math.max(candidate.top, rect.top) >
              Math.min(candidate.bottom - candidate.top, rect.height) / 2
          );

          if (line) {
            line.left = Math.min(line.left, rect.left);
            line.right = Math.max(line.right, rect.right);
          } else {
            starts.push({
              bottom: rect.bottom,
              end: match.index + match[0].length,
              left: rect.left,
              node: text,
              right: rect.right,
              top: rect.top,
            });
          }
        }
      }
    }

    const probes = new Map<(typeof starts)[number], HTMLElement>();

    for (const line of starts.toReversed()) {
      const probe = document.createElement("span");
      probe.style.cssText =
        "display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline;line-height:0;font-size:0";
      const range = document.createRange();
      range.setStart(line.node, line.end);
      range.collapse(true);
      range.insertNode(probe);
      probes.set(line, probe);
    }

    return {
      height: box.height,
      lines: starts.map((line) => ({
        baseline:
          (probes.get(line)?.getBoundingClientRect().top ?? line.top) - box.top,
        left: line.left - box.left,
        width: line.right - line.left,
      })),
    };
  } finally {
    clone.remove();
  }
};

export const scaledMetrics = (element: HTMLElement, metrics: FontMetrics) => {
  const size = parseCssNumber(getComputedStyle(element).fontSize);
  const scale = size / metrics.unitsPerEm;

  return {
    ascent: metrics.ascent * scale,
    cap: getCapHeight({ fontMetrics: metrics, fontSize: size }),
    descent: Math.abs(metrics.descent) * scale,
    xheight: metrics.xHeight * scale,
  };
};

export const exportTrimCss = (target: Target, mode: TrimMode) => {
  if (!target.font?.verified) {
    return "/* Select a loaded web font to export exact trim CSS. */";
  }

  const className = `article-${target.element.tagName.toLowerCase()}-${mode}`;
  const values = trimValues(target.element, target.font.metrics);
  const comment = `/* ${target.font.metrics.fullName}\n * Source: ${target.font.source}\n * Snapshot at ${values.fontSize} / ${values.lineHeight}.\n * Apply the class to this text element. Keep outer spacing on its parent.\n * Remove the class to restore the editorial default.\n */\n`;

  if (mode === "original") {
    return `${comment}.${className} { --blog-heading-trim: none; text-box-trim: none; }`;
  }

  if (mode === "native") {
    return `${comment}@supports (text-box-trim: trim-both) and (text-box-edge: cap alphabetic) {\n  .${className} { text-box-trim: trim-both; text-box-edge: cap alphabetic; }\n}`;
  }

  return `${comment}.${className} { --blog-heading-trim: none; text-box-trim: none; }\n${createStyleString(className, values)}`;
};

export const fontGuideOffset = (
  kind: "baseline" | "cap" | "xheight" | "ascent" | "descent",
  metrics: ReturnType<typeof scaledMetrics>
) => {
  const offsets = {
    ascent: -metrics.ascent,
    baseline: 0,
    cap: -metrics.cap,
    descent: metrics.descent,
    xheight: -metrics.xheight,
  };

  return offsets[kind];
};
