"use client";

import {
  useAnimationFrame,
  useResizeObserver,
  useWindowEvent,
} from "@personal-site/react-hooks";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { ArticleContentOverlay } from "./article-content-overlay";
import { ArticleRhythmInspector } from "./article-rhythm-inspector";
import { useEditorialFontPreference } from "./editorial-font-preference";
import controls from "./editorial-font-switcher-styles";
import {
  clearTrim,
  exportTrimCss,
  fontGuideOffset,
  measureBox,
  resolveFont,
  scaledMetrics,
  setTrim,
  supportedTrimMode,
  trimValues,
} from "./typography-inspector-measurements";
import type {
  BoxMeasurement,
  FontSource,
  Target,
  TrimMode,
} from "./typography-inspector-measurements";
import { InspectorSelect } from "./typography-inspector-select";

import styles from "./typography-inspector.module.css";

const { parseFloat: parseCssNumber } = Number;

interface Inspection {
  rect: { top: number; left: number; width: number; height: number };
  boxes: Partial<Record<TrimMode, BoxMeasurement>>;
  metrics?: ReturnType<typeof scaledMetrics>;
  size: string;
  leading: string;
  trimTop: number;
  trimBottom: number;
  nextGap?: number;
  css: string;
}

const px = (value: number | undefined) =>
  value === undefined ? "—" : `${value.toFixed(1)}px`;

const modeLabels: Record<TrimMode, string> = {
  capsize: "Capsize",
  native: "Native CSS",
  original: "Trim off",
};

const subscribeToCssSupport = () => (): undefined => undefined;

const supportsNativeTrim = () =>
  CSS.supports("text-box-trim", "trim-both") &&
  CSS.supports("text-box-edge", "cap alphabetic");

interface LoadedFonts {
  key: string;
  targets: Target[];
  files: FontSource[];
}

const emptyTargets: Target[] = [];
const emptyFonts: FontSource[] = [];

interface InspectionDetailsProps {
  target: Target | undefined;
  inspection: Inspection | undefined;
  metrics: Inspection["metrics"];
  currentBox: BoxMeasurement | undefined;
  originalBox: BoxMeasurement | undefined;
  copyStatus: string;
  onCopyStatus: (value: string) => void;
}

const TrimComparison = ({
  inspection,
  originalBox,
}: Pick<InspectionDetailsProps, "inspection" | "originalBox">) => (
  <table className={styles.table} aria-label="Measured typography comparison">
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
          <td className={styles.cell}>{px(inspection?.boxes[item]?.height)}</td>
          <td className={styles.cell}>
            {inspection?.boxes[item] && originalBox
              ? px(inspection.boxes[item].height - originalBox.height)
              : "—"}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const fontDescription = (target: Target) =>
  target.font?.source ??
  target.issue ??
  "System font file cannot be verified. Choose a self-hosted font for exact metrics and trimming.";

const SelectedInspection = ({
  target,
  inspection,
  metrics,
  currentBox,
  originalBox,
  copyStatus,
  onCopyStatus,
}: InspectionDetailsProps) => {
  if (!target) {
    return null;
  }

  return (
    <>
      <p className={styles.note}>
        {target.font?.metrics.fullName ?? "Font unavailable"} ·{" "}
        {inspection?.size} / {inspection?.leading}
      </p>
      <p className={`${styles.note} ${styles.asset}`}>
        {fontDescription(target)}
      </p>
      {target.font?.verified ? null : (
        <p className={styles.note}>
          Exact metric guides and Capsize comparison need a verified web font.
          Native heading defaults still follow the browser’s font metrics.
        </p>
      )}
      {metrics ? (
        <>
          <div className={styles.legend}>
            <span className={styles.cap}>Cap {px(metrics.cap)}</span>
            <span className={styles.xheight}>
              x-height {px(metrics.xheight)}
            </span>
            <span className={styles.ascent}>Ascent {px(metrics.ascent)}</span>
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
      <TrimComparison inspection={inspection} originalBox={originalBox} />
      <p className={styles.note}>
        {currentBox?.lines.length ?? 0} lines · First baseline{" "}
        {px(currentBox?.lines[0]?.baseline)} from block top · Gap to next block{" "}
        {px(inspection?.nextGap)}.
      </p>
      <p className={styles.note}>
        These are layout spaces. Descenders and accents can extend beyond the
        cap-to-baseline trim; inspect them visually.
      </p>
      <details>
        <summary>Export selected block as CSS</summary>
        <p className={styles.note}>
          CSS snapshot for this font and viewport. Apply its class deliberately;
          keep responsive size rules when adapting it.
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
              onCopyStatus("CSS copied");
            } catch {
              onCopyStatus("Select and copy the CSS above");
            }
          }}
        >
          Copy CSS
        </button>
        <output>{copyStatus}</output>
      </details>
    </>
  );
};

const inspectionPresentation = (
  targets: Target[],
  selected: number,
  inspection: Inspection | undefined,
  mode: TrimMode
) => {
  const target = targets[selected];

  const currentBox =
    inspection?.boxes[target?.font?.verified ? mode : "original"];

  const originalBox = inspection?.boxes.original;
  const metrics = target?.font?.verified ? inspection?.metrics : undefined;

  return { currentBox, metrics, originalBox, target };
};

const inspectionRevision = (
  mode: TrimMode,
  scope: string,
  inspection: Inspection | undefined
) =>
  `${mode}/${scope}/${inspection?.leading ?? ""}/${inspection?.rect.height ?? ""}`;

export const TypographyInspector = ({
  pathname,
  contentOverlay,
  onContentOverlayChange,
  spacingOverlay,
  onSpacingOverlayChange,
}: {
  pathname: string;
  contentOverlay: boolean;
  onContentOverlayChange: (enabled: boolean) => void;
  spacingOverlay: boolean;
  onSpacingOverlayChange: (enabled: boolean) => void;
}) => {
  const { displayFont, readingFont } = useEditorialFontPreference();
  const [selectedMode, setSelectedMode] = useState<TrimMode>("native");
  const [scope, setScope] = useState("headings");
  const [overlay, setOverlay] = useState(false);

  const nativeSupported = useSyncExternalStore(
    subscribeToCssSupport,
    supportsNativeTrim,
    () => false
  );

  const mode = supportedTrimMode(selectedMode, nativeSupported);
  const [loadedFonts, setLoadedFonts] = useState<LoadedFonts>();
  const fontKey = JSON.stringify([pathname, displayFont, readingFont, scope]);
  const currentFonts = loadedFonts?.key === fontKey ? loadedFonts : undefined;
  const targets = currentFonts?.targets ?? emptyTargets;
  const fontFiles = currentFonts?.files ?? emptyFonts;
  const [selected, setSelected] = useState(0);
  const [inspectionValue, setInspectionValue] = useState<Inspection>();
  const inspection = currentFonts ? inspectionValue : undefined;
  const loading = currentFonts === undefined;
  const [copyStatus, setCopyStatus] = useState("");
  const articleRef = useRef<HTMLElement | null>(null);

  const cache = useRef<{ key: string; boxes: Inspection["boxes"] } | null>(
    null
  );

  const targetId = useId();
  const modeId = useId();
  const scopeId = useId();

  // Font preferences change CSS root tokens, so they must restart asset resolution.
  // reactive CSS font tokens and route own the inspected DOM
  useEffect(() => {
    const controller = new AbortController();

    const article = document.querySelector<HTMLElement>(
      ".ui-article-typography > article"
    );

    articleRef.current = article;
    cache.current = null;
    let elements: HTMLElement[] = [];

    const load = async () => {
      await document.fonts.ready;

      if (controller.signal.aborted) {
        return;
      }

      if (!article) {
        if (!controller.signal.aborted) {
          setLoadedFonts({ files: [], key: fontKey, targets: [] });
        }

        return;
      }

      elements = [
        ...article.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p"),
      ].filter(
        (element) =>
          !element.closest("[data-prose-exclude], pre, table, figure, aside") &&
          (scope === "text" || /^H[1234]$/u.test(element.tagName)) &&
          !["::before", "::after"].some(
            (pseudo) =>
              !["none", "normal", '""'].includes(
                getComputedStyle(element, pseudo).content
              )
          )
      );

      const next = elements.map((element) => ({
        element,
        id: crypto.randomUUID(),
        label: `${element.tagName.toLowerCase()} · ${element.textContent?.trim().slice(0, 75)}`,
      }));

      // Include inline emphasis and table/list/code text in file provenance,
      // even when the trim preview is limited to headings.
      const fontElements = [
        ...article.querySelectorAll<HTMLElement>(
          "h1,h2,h3,h4,p,em,strong,code,li,figcaption,th,td"
        ),
      ].filter((element) => !element.closest("[data-prose-exclude]"));

      const pending = fontElements.map((element) =>
        resolveFont(element, controller.signal).catch(
          (): undefined => undefined
        )
      );

      const resolved = await Promise.all(
        next.map(async (target) => {
          try {
            return {
              ...target,
              font: await resolveFont(target.element, controller.signal),
            };
          } catch {
            return {
              ...target,
              issue:
                "Could not extract this font. Editorial defaults retained.",
            };
          }
        })
      );

      if (controller.signal.aborted) {
        return;
      }

      const allFonts = await Promise.all(pending);

      if (controller.signal.aborted) {
        return;
      }

      const files = new Map<string, FontSource>();

      for (const font of allFonts) {
        if (font?.verified) {
          files.set(font.source, font);
        }
      }

      setInspectionValue(undefined);
      setLoadedFonts({
        files: [...files.values()],
        key: fontKey,
        targets: resolved,
      });
      setSelected(0);
    };

    void load();

    return () => {
      controller.abort();

      for (const element of elements) {
        clearTrim(element);
      }

      articleRef.current = null;
    };
  }, [fontKey, scope]);

  const { requestFrame } = useAnimationFrame(() => {
    // Recompute edge trim after an explicit leading adjustment or responsive resize.
    for (const target of targets) {
      setTrim(target.element, mode, target.font);
    }

    const target = targets[selected];

    if (!target?.element.isConnected) {
      return false;
    }

    const rect = target.element.getBoundingClientRect();
    const css = getComputedStyle(target.element);
    const key = `${selected}/${scope}/${displayFont}/${readingFont}/${rect.width}/${rect.height}/${css.fontSize}/${css.lineHeight}/${css.letterSpacing}/${mode}/${target.element.textContent}`;
    let boxes = cache.current?.key === key ? cache.current.boxes : undefined;

    if (!boxes) {
      boxes = { original: measureBox(target.element, "original", target.font) };

      if (target.font?.verified) {
        boxes.capsize = measureBox(target.element, "capsize", target.font);

        if (nativeSupported) {
          boxes.native = measureBox(target.element, "native", target.font);
        }
      }

      cache.current = { boxes, key };
    }

    const values = target.font
      ? trimValues(target.element, target.font.metrics)
      : undefined;

    const size = parseCssNumber(css.fontSize);
    const next = target.element.nextElementSibling;
    setInspectionValue({
      boxes,
      css: exportTrimCss(target, mode),
      leading: css.lineHeight,
      metrics: target.font?.verified
        ? scaledMetrics(target.element, target.font.metrics)
        : undefined,
      nextGap: next
        ? next.getBoundingClientRect().top - rect.bottom
        : undefined,
      rect: {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      },
      size: css.fontSize,
      trimBottom: values ? -parseCssNumber(values.baselineTrim) * size : 0,
      trimTop: values ? -parseCssNumber(values.capHeightTrim) * size : 0,
    });

    return false;
  });

  useEffect(() => {
    for (const target of targets) {
      setTrim(target.element, mode, target.font);
    }

    cache.current = null;
    requestFrame();

    return () => {
      for (const target of targets) {
        clearTrim(target.element);
      }
    };
  }, [targets, mode, requestFrame]);

  useResizeObserver(articleRef, requestFrame, targets.length > 0);
  useWindowEvent("resize", requestFrame);
  useWindowEvent("scroll", requestFrame, true);

  const { target, currentBox, originalBox, metrics } = inspectionPresentation(
    targets,
    selected,
    inspection,
    mode
  );

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
        <InspectorSelect
          id={scopeId}
          value={scope}
          onChange={(event) => setScope(event.target.value)}
        >
          <option value="headings">Article headings</option>
          <option value="text">Headings and paragraphs</option>
        </InspectorSelect>
      </label>
      <label className={styles.label} htmlFor={modeId}>
        Typography comparison
        <InspectorSelect
          id={modeId}
          value={mode}
          onChange={(event) => setSelectedMode(event.target.value as TrimMode)}
        >
          <option value="original">Trim off · compare</option>
          <option value="capsize">Capsize · trim on</option>
          <option value="native" disabled={!nativeSupported}>
            Native CSS · editorial default
            {nativeSupported ? "" : " · unsupported"}
          </option>
        </InspectorSelect>
      </label>
      <ArticleRhythmInspector
        onChange={requestFrame}
        showGaps={spacingOverlay}
        onShowGapsChange={onSpacingOverlayChange}
      />
      <ArticleContentOverlay
        enabled={contentOverlay}
        onEnabledChange={onContentOverlayChange}
        revision={inspectionRevision(mode, scope, inspection)}
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
      {loading ? <output>Loading font files and metrics…</output> : null}
      <label className={styles.label} htmlFor={targetId}>
        Inspect an existing text block
        <InspectorSelect
          id={targetId}
          value={selected}
          onChange={(event) => {
            setSelected(Number(event.target.value));
            setCopyStatus("");
            requestFrame();
          }}
          disabled={!targets.length}
        >
          {targets.map((candidate, index) => (
            <option key={candidate.id} value={index}>
              {candidate.label}
            </option>
          ))}
        </InspectorSelect>
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
      <SelectedInspection
        target={target}
        inspection={inspection}
        metrics={metrics}
        currentBox={currentBox}
        originalBox={originalBox}
        copyStatus={copyStatus}
        onCopyStatus={setCopyStatus}
      />
      {!loading && !targets.length ? (
        <p className={styles.note}>No article text found on this page.</p>
      ) : null}
      {overlay && inspection && metrics && currentBox
        ? createPortal(
            <div className={styles.overlay} aria-hidden="true">
              <div
                className={styles.box}
                style={{
                  height: inspection.rect.height,
                  left: inspection.rect.left,
                  top: inspection.rect.top,
                  width: inspection.rect.width,
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
                      left: inspection.rect.left + line.left,
                      top:
                        inspection.rect.top +
                        line.baseline +
                        fontGuideOffset(kind, metrics),
                      width: line.width,
                    }}
                  />
                ))
              )}
            </div>,
            document.body
          )
        : null}
    </section>
  );
};
