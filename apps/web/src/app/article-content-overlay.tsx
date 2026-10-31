"use client";

import {
  useAnimationFrame,
  useResizeObserver,
  useWindowEvent,
} from "@personal-site/react-hooks";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useEditorialFontPreference } from "./editorial-font-preference";
import {
  type FontSource,
  measureBox,
  resolveFont,
  scaledMetrics,
} from "./typography-inspector-measurements";

import styles from "./typography-inspector.module.css";

const textSelector =
  "h1,h2,h3,h4,h5,h6,p,pre,li,dt,dd,th,td,figcaption,blockquote,button,summary";
const boxSelector = `${textSelector},ul,ol,dl,table,tr,figure,aside,img,video,svg,svg text,svg rect,svg foreignObject,[data-prose-exclude],[data-mdx-table]`;
type Rect = { top: number; left: number; width: number; height: number };
type Guide = Rect & {
  key: string;
  kind: "baseline" | "cap" | "xheight" | "ascent" | "descent";
};
type ContentBox = Rect & { key: string; label: string };

// Custom article figures can render into an open shadow root (Giotto does).
function contentRoots(article: HTMLElement) {
  const roots: (HTMLElement | ShadowRoot)[] = [article];
  for (let index = 0; index < roots.length; index++) {
    for (const element of roots[index].querySelectorAll("*"))
      if (element.shadowRoot) roots.push(element.shadowRoot);
  }
  return roots;
}

// Text nodes find their nearest block owner, including component labels that use
// div/span instead of prose tags. Inline emphasis stays with its owning line.
function textBlocks(article: HTMLElement) {
  const blocks = new Set<HTMLElement>();
  for (const root of contentRoots(article)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      let element = node.parentElement;
      if (
        !element ||
        element.closest("script,style,svg,[data-typography-probe]")
      )
        continue;
      while (element instanceof HTMLElement && element !== article) {
        if (
          element.matches(textSelector) ||
          !["inline", "contents"].includes(getComputedStyle(element).display)
        )
          break;
        element = element.parentElement;
      }
      if (element instanceof HTMLElement && element !== article)
        blocks.add(element);
    }
  }
  return [...blocks];
}

function clippedRect(element: Element): Rect | undefined {
  const rect = element.getBoundingClientRect();
  let top = Math.max(0, rect.top),
    left = Math.max(0, rect.left);
  let bottom = Math.min(window.innerHeight, rect.bottom),
    right = Math.min(window.innerWidth, rect.right);
  for (
    let parent: Element | null = element.parentElement;
    parent;
    parent =
      parent.parentElement ??
      (parent.getRootNode() instanceof ShadowRoot
        ? (parent.getRootNode() as ShadowRoot).host
        : null)
  ) {
    const css = getComputedStyle(parent),
      bounds = parent.getBoundingClientRect();
    if (["auto", "scroll", "hidden", "clip"].includes(css.overflowX)) {
      left = Math.max(left, bounds.left + parent.clientLeft);
      right = Math.min(
        right,
        bounds.left + parent.clientLeft + parent.clientWidth,
      );
    }
    if (["auto", "scroll", "hidden", "clip"].includes(css.overflowY)) {
      top = Math.max(top, bounds.top + parent.clientTop);
      bottom = Math.min(
        bottom,
        bounds.top + parent.clientTop + parent.clientHeight,
      );
    }
  }
  if (
    right <= left ||
    bottom <= top ||
    getComputedStyle(element).visibility === "hidden"
  )
    return undefined;
  return { top, left, width: right - left, height: bottom - top };
}

export function ArticleContentOverlay({
  revision,
  enabled,
  onEnabledChange,
}: {
  revision: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  const { displayFont, readingFont } = useEditorialFontPreference();
  const [fontGuides, setFontGuides] = useState(true);
  const [boxes, setBoxes] = useState<ContentBox[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [edges, setEdges] = useState<number[]>([]);
  const [fonts, setFonts] = useState(
    new Map<HTMLElement, FontSource | undefined>(),
  );
  const [contentVersion, setContentVersion] = useState(0);
  const articleRef = useRef<HTMLElement | null>(null);
  const measurements = useRef(
    new WeakMap<
      HTMLElement,
      { key: string; box: ReturnType<typeof measureBox> }
    >(),
  );
  const { requestFrame } = useAnimationFrame(() => {
    const article = articleRef.current;
    if (!enabled || !article) return false;
    const texts = textBlocks(article);
    const elements = new Set<Element>([
      ...contentRoots(article).flatMap((root) => [
        ...root.querySelectorAll(boxSelector),
      ]),
      ...texts,
    ]);
    const nextBoxes: ContentBox[] = [],
      nextGuides: Guide[] = [];
    let index = 0;
    for (const element of elements) {
      if (element.closest("[data-typography-probe]")) continue;
      const clip = clippedRect(element);
      if (!clip) continue;
      const key = String(index++);
      nextBoxes.push({
        ...clip,
        key,
        label: `${element.tagName.toLowerCase()} · ${element.getBoundingClientRect().width.toFixed(0)}px`,
      });
    }
    if (fontGuides)
      for (const element of texts) {
        const clip = clippedRect(element),
          font = fonts.get(element);
        if (!clip || !font?.verified) continue;
        const rect = element.getBoundingClientRect(),
          css = getComputedStyle(element);
        const key = `${rect.width}/${css.fontSize}/${css.lineHeight}/${css.fontWeight}/${css.fontStyle}/${css.letterSpacing}/${css.padding}/${css.border}/${css.getPropertyValue("text-box-trim")}/${revision}/${element.textContent}`;
        let measured = measurements.current.get(element);
        if (measured?.key !== key) {
          const mode = element.classList.contains(styles.capsize)
            ? "capsize"
            : css.getPropertyValue("text-box-trim") === "trim-both"
              ? "native"
              : "original";
          measured = { key, box: measureBox(element, mode, font) };
          measurements.current.set(element, measured);
        }
        const metrics = scaledMetrics(element, font.metrics);
        for (const [lineIndex, line] of measured.box.lines.entries()) {
          for (const kind of [
            "baseline",
            "cap",
            "xheight",
            "ascent",
            "descent",
          ] as const) {
            const top =
              rect.top +
              line.baseline +
              (kind === "baseline"
                ? 0
                : kind === "descent"
                  ? metrics.descent
                  : -metrics[kind]);
            const left = Math.max(clip.left, rect.left + line.left);
            const right = Math.min(
              clip.left + clip.width,
              rect.left + line.left + line.width,
            );
            if (
              top >= clip.top &&
              top <= clip.top + clip.height &&
              right > left
            )
              nextGuides.push({
                key: `${texts.indexOf(element)}-${lineIndex}-${kind}`,
                kind,
                top,
                left,
                width: right - left,
                height: 0,
              });
          }
        }
      }
    const prose = article
      .querySelector(
        ".ui-article-prose > p, .ui-article-prose > h2, .ui-article-prose > figure",
      )
      ?.getBoundingClientRect();
    setEdges(prose ? [prose.left, prose.right] : []);
    setBoxes(nextBoxes);
    setGuides(nextGuides);
    return false;
  });

  // reconnect when newly loaded components add shadow roots
  useEffect(() => {
    if (!enabled) return;
    const article = document.querySelector<HTMLElement>(
      ".ui-article-typography > article",
    );
    articleRef.current = article;
    if (!article) return;
    // The shared hooks have no DOM mutation observer. Ignore measurement clones
    // so asynchronously loaded figures can refresh without an observation loop.
    const observer = new MutationObserver((records) => {
      const changes = records.filter((record) => {
        const target =
          record.target instanceof Element
            ? record.target
            : record.target.parentElement;
        if (target?.closest("[data-typography-probe]")) return false;
        if (record.type !== "childList") return true;
        return [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            !(
              node instanceof Element &&
              node.hasAttribute("data-typography-probe")
            ),
        );
      });
      if (changes.length) requestFrame();
      if (changes.some((record) => record.type !== "attributes"))
        setContentVersion((value) => value + 1);
    });
    for (const root of contentRoots(article))
      observer.observe(root, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "transform",
          "x",
          "y",
          "width",
          "height",
          "viewBox",
          "hidden",
        ],
      });
    requestFrame();
    return () => {
      observer.disconnect();
      articleRef.current = null;
    };
  }, [enabled, contentVersion, requestFrame]);

  // font tokens and dynamic article content restart exact-asset resolution
  useEffect(() => {
    const article = articleRef.current;
    if (!enabled || !article) return;
    const controller = new AbortController();
    async function load() {
      await document.fonts.ready;
      if (controller.signal.aborted || !article) return;
      const pending = new Map<string, ReturnType<typeof resolveFont>>();
      const resolved = await Promise.all(
        textBlocks(article).map(async (element) => {
          const css = getComputedStyle(element),
            key = `${css.fontFamily}/${css.fontWeight}/${css.fontStyle}`;
          if (!pending.has(key))
            pending.set(
              key,
              resolveFont(element, controller.signal).catch(() => undefined),
            );
          return [element, await pending.get(key)] as const;
        }),
      );
      if (controller.signal.aborted) return;
      measurements.current = new WeakMap();
      setFonts(new Map(resolved));
      requestFrame();
    }
    void load();
    return () => controller.abort();
  }, [enabled, contentVersion, displayFont, readingFont, requestFrame]);

  // these inputs invalidate the latest frame callback
  useEffect(() => {
    requestFrame();
  }, [enabled, fontGuides, fonts, revision, requestFrame]);
  useResizeObserver(articleRef, requestFrame, enabled);
  useWindowEvent("scroll", requestFrame, true);
  useWindowEvent("resize", requestFrame);

  return (
    <div className={styles.rhythm}>
      <label className={styles.row}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        Show all content overlays
      </label>
      {enabled ? (
        <>
          <label className={styles.row}>
            <input
              type="checkbox"
              checked={fontGuides}
              onChange={(event) => setFontGuides(event.target.checked)}
            />
            Include font guides for all text
          </label>
          <p className={styles.note}>
            Teal rails mark the reading column. Gold boxes show visible content,
            including tables, lists, code, notes and figures. Embedded content
            is measured without restyling it. SVG text has boxes; font guides
            require a verified HTML font.
          </p>
          {createPortal(
            <div
              className={styles.overlay}
              aria-hidden="true"
              data-article-content-overlay=""
            >
              {edges.map((left) => (
                <div
                  key={left}
                  className={styles.columnEdge}
                  style={{ left }}
                />
              ))}
              {boxes.map((box) => (
                <div
                  key={box.key}
                  className={styles.box}
                  data-content-box={box.label}
                  style={{
                    top: box.top,
                    left: box.left,
                    width: box.width,
                    height: box.height,
                  }}
                >
                  <span className={styles.boxLabel}>{box.label}</span>
                </div>
              ))}
              {guides.map((guide) => (
                <div
                  key={guide.key}
                  data-font-guide={guide.kind}
                  className={`${styles.guide} ${styles[guide.kind]}`}
                  style={{
                    top: guide.top,
                    left: guide.left,
                    width: guide.width,
                  }}
                />
              ))}
            </div>,
            document.body,
          )}
        </>
      ) : null}
    </div>
  );
}
