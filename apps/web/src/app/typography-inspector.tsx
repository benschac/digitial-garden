"use client";

import {
  useAnimationFrame,
  useResizeObserver,
  useWindowEvent,
} from "@personal-site/react-hooks";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArticleContentOverlay } from "./article-content-overlay";
import { ArticleRhythmInspector } from "./article-rhythm-inspector";
import { useEditorialFontPreference } from "./editorial-font-preference";
import controls from "./editorial-font-switcher-styles";
import styles from "./typography-inspector.module.css";
import {
  type BoxMeasurement,
  clearTrim,
  exportTrimCss,
  type FontSource,
  measureBox,
  resolveFont,
  scaledMetrics,
  setTrim,
  type Target,
  type TrimMode,
  trimValues,
} from "./typography-inspector-measurements";

type Inspection = {
  rect: { top: number; left: number; width: number; height: number };
  boxes: Partial<Record<TrimMode, BoxMeasurement>>;
  metrics?: ReturnType<typeof scaledMetrics>;
  size: string;
  leading: string;
  trimTop: number;
  trimBottom: number;
  nextGap?: number;
  css: string;
};
const px = (value: number | undefined) =>
  value === undefined ? "—" : `${value.toFixed(1)}px`;
const modeLabels: Record<TrimMode, string> = {
  original: "Trim off",
  capsize: "Capsize",
  native: "Native CSS",
};

export function TypographyInspector({ pathname }: { pathname: string }) {
  const { displayFont, readingFont } = useEditorialFontPreference();
  const [mode, setMode] = useState<TrimMode>("native");
  const [scope, setScope] = useState("headings");
  const [overlay, setOverlay] = useState(false);
  const [nativeSupported, setNativeSupported] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [fontFiles, setFontFiles] = useState<FontSource[]>([]);
  const [selected, setSelected] = useState(0);
  const [inspection, setInspection] = useState<Inspection>();
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const articleRef = useRef<HTMLElement | null>(null);
  const cache = useRef<{ key: string; boxes: Inspection["boxes"] } | null>(
    null,
  );
  const targetId = useId();
  const modeId = useId();
  const scopeId = useId();

  useEffect(() => {
    const supported =
      CSS.supports("text-box-trim", "trim-both") &&
      CSS.supports("text-box-edge", "cap alphabetic");
    setNativeSupported(supported);
    setMode(supported ? "native" : "original");
  }, []);

  // Font preferences change CSS root tokens, so they must restart asset resolution.
  // reactive CSS font tokens and route own the inspected DOM
  useEffect(() => {
    const controller = new AbortController();
    const article = document.querySelector<HTMLElement>(
      ".ui-article-typography > article",
    );
    articleRef.current = article;
    setLoading(true);
    setInspection(undefined);
    setTargets([]);
    setFontFiles([]);
    cache.current = null;
    if (!article) {
      setLoading(false);
      return () => controller.abort();
    }
    const elements = [
      ...article.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p"),
    ].filter(
      (element) =>
        !element.closest("[data-prose-exclude], pre, table, figure, aside") &&
        (scope === "text" || /^H[1234]$/.test(element.tagName)) &&
        !["::before", "::after"].some(
          (pseudo) =>
            !["none", "normal", '""'].includes(
              getComputedStyle(element, pseudo).content,
            ),
        ),
    );
    const next = elements.map((element) => ({
      element,
      id: crypto.randomUUID(),
      label: `${element.tagName.toLowerCase()} · ${element.textContent?.trim().slice(0, 75)}`,
    }));
    async function load() {
      await document.fonts.ready;
      if (controller.signal.aborted || !article) return;
      // Resolve once per font/style/weight, including synthesized weights.
      const pending = new Map<string, ReturnType<typeof resolveFont>>();
      // Include inline emphasis and table/list/code text in file provenance,
      // even when the trim preview is limited to headings.
      const fontElements = [
        ...article.querySelectorAll<HTMLElement>(
          "h1,h2,h3,h4,p,em,strong,code,li,figcaption,th,td",
        ),
      ].filter((element) => !element.closest("[data-prose-exclude]"));
      for (const element of fontElements) {
        const css = getComputedStyle(element);
        const key = `${css.fontFamily}/${css.fontWeight}/${css.fontStyle}`;
        if (!pending.has(key))
          pending.set(
            key,
            resolveFont(element, controller.signal).catch(() => undefined),
          );
      }
      const resolved = await Promise.all(
        next.map(async (target) => {
          const css = getComputedStyle(target.element);
          const key = `${css.fontFamily}/${css.fontWeight}/${css.fontStyle}`;
          let result = pending.get(key);
          if (!result) {
            result = resolveFont(target.element, controller.signal);
            pending.set(key, result);
          }
          try {
            return { ...target, font: await result };
          } catch {
            return {
              ...target,
              issue:
                "Could not extract this font. Editorial defaults retained.",
            };
          }
        }),
      );
      if (controller.signal.aborted) return;
      const allFonts = await Promise.all(pending.values());
      if (controller.signal.aborted) return;
      const files = new Map<string, FontSource>();
      for (const font of allFonts)
        if (font?.verified) files.set(font.source, font);
      setFontFiles([...files.values()]);
      setTargets(resolved);
      setSelected(0);
      setLoading(false);
    }
    void load();
    return () => {
      controller.abort();
      elements.forEach(clearTrim);
      articleRef.current = null;
    };
  }, [pathname, displayFont, readingFont, scope]);

  const { requestFrame } = useAnimationFrame(() => {
    // Recompute edge trim after an explicit leading adjustment or responsive resize.
    for (const target of targets) setTrim(target.element, mode, target.font);
    const target = targets[selected];
    if (!target?.element.isConnected) return false;
    const rect = target.element.getBoundingClientRect();
    const css = getComputedStyle(target.element);
    const key = `${selected}/${scope}/${displayFont}/${readingFont}/${rect.width}/${rect.height}/${css.fontSize}/${css.lineHeight}/${css.letterSpacing}/${mode}/${target.element.textContent}`;
    let boxes = cache.current?.key === key ? cache.current.boxes : undefined;
    if (!boxes) {
      boxes = { original: measureBox(target.element, "original", target.font) };
      if (target.font?.verified) {
        boxes.capsize = measureBox(target.element, "capsize", target.font);
        if (nativeSupported)
          boxes.native = measureBox(target.element, "native", target.font);
      }
      cache.current = { key, boxes };
    }
    const values = target.font
      ? trimValues(target.element, target.font.metrics)
      : undefined;
    const size = Number.parseFloat(css.fontSize);
    const next = target.element.nextElementSibling;
    setInspection({
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      boxes,
      size: css.fontSize,
      leading: css.lineHeight,
      metrics: target.font?.verified
        ? scaledMetrics(target.element, target.font.metrics)
        : undefined,
      trimTop: values ? -Number.parseFloat(values.capHeightTrim) * size : 0,
      trimBottom: values ? -Number.parseFloat(values.baselineTrim) * size : 0,
      nextGap: next
        ? next.getBoundingClientRect().top - rect.bottom
        : undefined,
      css: exportTrimCss(target, mode),
    });
    return false;
  });

  useEffect(() => {
    for (const target of targets) setTrim(target.element, mode, target.font);
    cache.current = null;
    requestFrame();
    return () => {
      for (const target of targets) clearTrim(target.element);
    };
  }, [targets, mode, requestFrame]);

  useResizeObserver(articleRef, requestFrame, targets.length > 0);
  useWindowEvent("resize", requestFrame);
  useWindowEvent("scroll", requestFrame, true);

  const target = targets[selected];
  const currentBox =
    inspection?.boxes[target?.font?.verified ? mode : "original"];
  const originalBox = inspection?.boxes.original;
  const metrics = target?.font?.verified ? inspection?.metrics : undefined;

  return (
    <section className={styles.panel} aria-label="Article metric inspector">
      <strong>Article leading trim</strong>
      <p className={styles.note}>
        Native heading trim is the editorial default where supported. Closing
        keeps your selected preview; Reset preview restores the default.
        Trimming preserves font size and spacing between lines.
      </p>
      <label className={styles.label} htmlFor={scopeId}>
        Apply comparison to
        <select
          className={`${controls.select} ${styles.select}`}
          id={scopeId}
          value={scope}
          onChange={(event) => setScope(event.target.value)}
        >
          <option value="headings">Article headings</option>
          <option value="text">Headings and paragraphs</option>
        </select>
      </label>
      <label className={styles.label} htmlFor={modeId}>
        Typography comparison
        <select
          className={`${controls.select} ${styles.select}`}
          id={modeId}
          value={mode}
          onChange={(event) => setMode(event.target.value as TrimMode)}
        >
          <option value="original">Trim off · compare</option>
          <option value="capsize">Capsize · trim on</option>
          <option value="native" disabled={!nativeSupported}>
            Native CSS · editorial default
            {nativeSupported ? "" : " · unsupported"}
          </option>
        </select>
      </label>
      <ArticleRhythmInspector onChange={requestFrame} />
      <ArticleContentOverlay
        revision={`${mode}/${scope}/${inspection?.leading ?? ""}/${inspection?.rect.height ?? ""}`}
      />
      <details>
        <summary>Article font files · {fontFiles.length}</summary>
        <p className={styles.note}>
          Extracted from loaded self-hosted faces, including emphasis and
          alternate weights. Values below are font units; guides use the
          selected block’s pixel size.
        </p>
        {fontFiles.map((font) => (
          <div key={font.source} className={styles.rhythm}>
            <strong>{font.metrics.fullName}</strong>
            <span className={styles.asset}>{font.source}</span>
            <span className={styles.note}>
              Cap {font.metrics.capHeight} · x-height {font.metrics.xHeight} ·
              Ascent {font.metrics.ascent} · Descent {font.metrics.descent} ·
              Line gap {font.metrics.lineGap} · Units/em{" "}
              {font.metrics.unitsPerEm}
            </span>
          </div>
        ))}
      </details>
      {loading ? <p role="status">Loading font files and metrics…</p> : null}
      <label className={styles.label} htmlFor={targetId}>
        Inspect an existing text block
        <select
          className={`${controls.select} ${styles.select}`}
          id={targetId}
          value={selected}
          onChange={(event) => {
            setSelected(Number(event.target.value));
            setCopyStatus("");
            requestFrame();
          }}
          disabled={!targets.length}
        >
          {targets.map((target, index) => (
            <option key={target.id} value={index}>
              {target.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={controls.toggle}
        onClick={() => target?.element.scrollIntoView({ block: "center" })}
        disabled={!target}
      >
        Scroll to inspected text
      </button>
      <label className={styles.row}>
        <input
          type="checkbox"
          checked={overlay}
          onChange={(event) => {
            setOverlay(event.target.checked);
            requestFrame();
          }}
          disabled={!metrics}
        />{" "}
        Show guides for selected text
      </label>
      {target ? (
        <>
          <p className={styles.note}>
            {target.font?.metrics.fullName ?? "Font unavailable"} ·{" "}
            {inspection?.size} / {inspection?.leading}
          </p>
          <p className={`${styles.note} ${styles.asset}`}>
            {target.font?.source ??
              target.issue ??
              "System font file cannot be verified. Choose a self-hosted font for exact metrics and trimming."}
          </p>
          {!target.font?.verified ? (
            <p className={styles.note}>
              Exact metric guides and Capsize comparison need a verified web
              font. Native heading defaults still follow the browser’s font
              metrics.
            </p>
          ) : null}
          {metrics ? (
            <>
              <div className={styles.legend}>
                <span className={styles.cap}>Cap {px(metrics.cap)}</span>
                <span className={styles.xheight}>
                  x-height {px(metrics.xheight)}
                </span>
                <span className={styles.ascent}>
                  Ascent {px(metrics.ascent)}
                </span>
                <span className={styles.descent}>
                  Descent {px(metrics.descent)}
                </span>
                <span className={styles.baseline}>Baseline (red)</span>
              </div>
              <p className={styles.note}>
                Font-wide guides, not glyph ink bounds. Gold outline: DOM block.
                Baselines: browser probes in a matching clone.
              </p>
              <p className={styles.note}>
                Capsize edge trim: top {px(inspection?.trimTop)}, bottom{" "}
                {px(inspection?.trimBottom)}. Only the first and last line edges
                change; multiline baseline spacing stays intact.
              </p>
            </>
          ) : null}
          <table
            className={styles.table}
            aria-label="Measured typography comparison"
          >
            <thead>
              <tr>
                <th className={styles.cell}>Mode</th>
                <th className={styles.cell}>Block height</th>
                <th className={styles.cell}>Δ trim off</th>
              </tr>
            </thead>
            <tbody>
              {(["original", "capsize", "native"] as const).map((item) => (
                <tr key={item}>
                  <th className={styles.cell}>{modeLabels[item]}</th>
                  <td className={styles.cell}>
                    {px(inspection?.boxes[item]?.height)}
                  </td>
                  <td className={styles.cell}>
                    {inspection?.boxes[item] && originalBox
                      ? px(inspection.boxes[item].height - originalBox.height)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.note}>
            {currentBox?.lines.length ?? 0} lines · First baseline{" "}
            {px(currentBox?.lines[0]?.baseline)} from block top · Gap to next
            block {px(inspection?.nextGap)}.
          </p>
          <p className={styles.note}>
            These are layout spaces. Descenders and accents can extend beyond
            the cap-to-baseline trim; inspect them visually.
          </p>
          <details>
            <summary>Export selected block as CSS</summary>
            <p className={styles.note}>
              CSS snapshot for this font and viewport. Apply its class
              deliberately; keep responsive size rules when adapting it.
            </p>
            <textarea
              aria-label="Exported trim CSS"
              className={styles.css}
              readOnly
              value={inspection?.css ?? ""}
            />
            <button
              type="button"
              className={controls.toggle}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inspection?.css ?? "");
                  setCopyStatus("CSS copied");
                } catch {
                  setCopyStatus("Select and copy the CSS above");
                }
              }}
            >
              Copy CSS
            </button>
            <span role="status">{copyStatus}</span>
          </details>
        </>
      ) : null}
      {!loading && !targets.length ? (
        <p className={styles.note}>No article text found on this page.</p>
      ) : null}
      {overlay && inspection && metrics && currentBox
        ? createPortal(
            <div className={styles.overlay} aria-hidden="true">
              <div
                className={styles.box}
                style={{
                  top: inspection.rect.top,
                  left: inspection.rect.left,
                  width: inspection.rect.width,
                  height: inspection.rect.height,
                }}
              />
              {currentBox.lines.flatMap((line) =>
                (
                  ["cap", "xheight", "ascent", "baseline", "descent"] as const
                ).map((kind) => (
                  <div
                    key={`${line.baseline}-${kind}`}
                    className={`${styles.guide} ${styles[kind]}`}
                    style={{
                      top:
                        inspection.rect.top +
                        line.baseline +
                        (kind === "baseline"
                          ? 0
                          : kind === "descent"
                            ? metrics.descent
                            : -metrics[kind]),
                      left: inspection.rect.left + line.left,
                      width: line.width,
                    }}
                  />
                )),
              )}
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
