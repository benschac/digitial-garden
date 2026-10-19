import {
  createStyleString,
  type FontMetrics,
  getCapHeight,
  precomputeValues,
} from "@capsizecss/core";
import georgia from "@capsizecss/metrics/georgia";

import { decodeTypographyMetrics } from "./typography-metrics-schema";

import styles from "./typography-inspector.module.css";

export type TrimMode = "original" | "capsize" | "native";
export type FontSource = {
  metrics: FontMetrics;
  source: string;
  verified: boolean;
};
export type Target = {
  id: string;
  element: HTMLElement;
  label: string;
  font?: FontSource;
  issue?: string;
};
export type LineMeasurement = { baseline: number; left: number; width: number };
export type BoxMeasurement = { height: number; lines: LineMeasurement[] };

const metricCache = new Map<string, FontSource>();
const unquote = (value: string) => value.replace(/^["']|["']$/g, "");

// CSS Fonts weight matching, including the special 400–500 search order.
export function weightDistance(weight: number, candidate: number) {
  if (weight >= 400 && weight <= 500) {
    if (candidate >= weight && candidate <= 500) return candidate - weight;
    if (candidate < weight) return 1000 + weight - candidate;
    return 2000 + candidate - weight;
  }
  if (weight < 400)
    return candidate <= weight ? weight - candidate : 1000 + candidate - weight;
  return candidate >= weight ? candidate - weight : 1000 + weight - candidate;
}

function fontFaces() {
  const faces: CSSFontFaceRule[] = [];
  const visit = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSFontFaceRule) faces.push(rule);
      else if ("cssRules" in rule) visit((rule as CSSGroupingRule).cssRules);
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
}

export async function resolveFont(
  element: HTMLElement,
  signal: AbortSignal,
): Promise<FontSource | undefined> {
  const css = getComputedStyle(element);
  const family = unquote(css.fontFamily.split(",")[0].trim());
  const weight = Number.parseFloat(css.fontWeight) || 400;
  const familyFaces = fontFaces().filter(
    (face) => unquote(face.style.fontFamily) === family,
  );
  const matchingStyle = familyFaces.filter(
    (face) => (face.style.fontStyle || "normal") === css.fontStyle,
  );
  // CSS synthesizes italics when a family supplies only upright faces.
  const candidates = matchingStyle.length
    ? matchingStyle
    : familyFaces.filter(
        (face) => (face.style.fontStyle || "normal") === "normal",
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
      weightDistance(weight, faceWeight(b)),
  );
  // For a split Google font, inspect the Latin asset rather than another subset.
  const nearest = candidates.filter(
    (face) => faceWeight(face) === faceWeight(candidates[0]),
  );
  const face =
    nearest.find((face) =>
      /U\+0-FF/i.test(face.style.getPropertyValue("unicode-range")),
    ) ?? nearest[0];
  const asset = face?.style
    .getPropertyValue("src")
    .match(/\/([^/"')]+\.(?:woff2?|otf|ttf))/)?.[1];
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
    element.textContent ?? "Hg",
  );
  if (
    signal.aborted ||
    !loaded.length ||
    loaded.some((font) => font.status !== "loaded")
  )
    return undefined;
  const cached = metricCache.get(asset);
  if (cached) return cached;
  const response = await fetch(
    `/api/typography-metrics?asset=${encodeURIComponent(asset)}`,
    { signal },
  );
  if (!response.ok) throw new Error("Metrics unavailable for this font asset");
  const result = decodeTypographyMetrics(await response.json());
  const source: FontSource = { ...result, verified: true };
  if (!signal.aborted) metricCache.set(asset, source);
  return source;
}

export function trimValues(element: HTMLElement, metrics: FontMetrics) {
  const css = getComputedStyle(element);
  const fontSize = Number.parseFloat(css.fontSize);
  const leading = Number.parseFloat(css.lineHeight);
  return precomputeValues({
    fontSize,
    ...(Number.isFinite(leading) ? { leading } : {}),
    fontMetrics: metrics,
  });
}

export function setTrim(
  element: HTMLElement,
  mode: TrimMode,
  font?: FontSource,
) {
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
}

export function clearTrim(element: HTMLElement) {
  element.classList.remove(styles.untrimmed, styles.capsize, styles.native);
  element.style.removeProperty("--inspector-cap-trim");
  element.style.removeProperty("--inspector-baseline-trim");
}

/**
 * Measure an offscreen clone so baseline probes never split React-owned text.
 * Range rectangles locate wrapped words; zero-height inline probes measure the
 * browser's baseline. These are line/layout measurements, never glyph ink bounds.
 */
export function measureBox(
  element: HTMLElement,
  mode: TrimMode,
  font?: FontSource,
): BoxMeasurement {
  const css = getComputedStyle(element);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-typography-probe", "");
  clone.inert = true;
  for (const property of css)
    clone.style.setProperty(property, css.getPropertyValue(property));
  Object.assign(clone.style, {
    position: "fixed",
    left: "-10000px",
    top: "0px",
    margin: "0px",
    width: `${element.getBoundingClientRect().width}px`,
    height: "auto",
    minHeight: "0px",
    maxHeight: "none",
    transform: "none",
    visibility: "hidden",
    gridArea: "auto",
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
      for (const match of text.data.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(text, match.index);
        range.setEnd(text, match.index + match[0].length);
        for (const rect of range.getClientRects()) {
          if (!rect.width) continue;
          const line = starts.find(
            (line) =>
              Math.min(line.bottom, rect.bottom) -
                Math.max(line.top, rect.top) >
              Math.min(line.bottom - line.top, rect.height) / 2,
          );
          if (line) {
            line.left = Math.min(line.left, rect.left);
            line.right = Math.max(line.right, rect.right);
          } else
            starts.push({
              node: text,
              end: match.index + match[0].length,
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
            });
        }
      }
    }
    const probes = new Map<(typeof starts)[number], HTMLElement>();
    for (const line of [...starts].reverse()) {
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
}

export function scaledMetrics(element: HTMLElement, metrics: FontMetrics) {
  const size = Number.parseFloat(getComputedStyle(element).fontSize);
  const scale = size / metrics.unitsPerEm;
  return {
    cap: getCapHeight({ fontSize: size, fontMetrics: metrics }),
    xheight: metrics.xHeight * scale,
    ascent: metrics.ascent * scale,
    descent: Math.abs(metrics.descent) * scale,
  };
}

export function exportTrimCss(target: Target, mode: TrimMode) {
  if (!target.font?.verified)
    return "/* Select a loaded web font to export exact trim CSS. */";
  const className = `article-${target.element.tagName.toLowerCase()}-${mode}`;
  const values = trimValues(target.element, target.font.metrics);
  const comment = `/* ${target.font.metrics.fullName}\n * Source: ${target.font.source}\n * Snapshot at ${values.fontSize} / ${values.lineHeight}.\n * Apply the class to this text element. Keep outer spacing on its parent.\n * Remove the class to restore the editorial default.\n */\n`;
  if (mode === "original")
    return `${comment}.${className} { --blog-heading-trim: none; text-box-trim: none; }`;
  if (mode === "native")
    return `${comment}@supports (text-box-trim: trim-both) and (text-box-edge: cap alphabetic) {\n  .${className} { text-box-trim: trim-both; text-box-edge: cap alphabetic; }\n}`;
  return (
    comment +
    `.${className} { --blog-heading-trim: none; text-box-trim: none; }\n` +
    createStyleString(className, values)
  );
}
