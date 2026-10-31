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
  fontGuideOffset,
  measureBox,
  resolveFont,
  scaledMetrics,
} from "./typography-inspector-measurements";
import type { FontSource } from "./typography-inspector-measurements";

import styles from "./typography-inspector.module.css";

const textSelector =
  "h1,h2,h3,h4,h5,h6,p,pre,li,dt,dd,th,td,figcaption,blockquote,button,summary";

const boxSelector = `${textSelector},ul,ol,dl,table,tr,figure,aside,img,video,svg,svg text,svg rect,svg foreignObject,[data-prose-exclude],[data-mdx-table]`;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type Guide = Rect & {
  key: string;
  kind: "baseline" | "cap" | "xheight" | "ascent" | "descent";
};

type ContentBox = Rect & { key: string; label: string };

// Custom article figures can render into an open shadow root (Giotto does).
const contentRoots = (article: HTMLElement) => {
  const roots: (HTMLElement | ShadowRoot)[] = [article];

  for (const root of roots) {
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) {
        roots.push(element.shadowRoot);
      }
    }
  }

  return roots;
};

// Text nodes find their nearest block owner, including component labels that use
// div/span instead of prose tags. Inline emphasis stays with its owning line.
const textBlocks = (article: HTMLElement) => {
  const blocks = new Set<HTMLElement>();

  for (const root of contentRoots(article)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) {
        continue;
      }

      let element = node.parentElement;

      if (
        !element ||
        element.closest("script,style,svg,[data-typography-probe]")
      ) {
        continue;
      }

      while (element instanceof HTMLElement && element !== article) {
        if (
          element.matches(textSelector) ||
          !["inline", "contents"].includes(getComputedStyle(element).display)
        ) {
          break;
        }

        element = element.parentElement;
      }

      if (element instanceof HTMLElement && element !== article) {
        blocks.add(element);
      }
    }
  }

  return [...blocks];
};

const trimModeForElement = (element: HTMLElement, css: CSSStyleDeclaration) => {
  let mode: "capsize" | "native" | "original" = "original";

  if (element.classList.contains(styles.capsize)) {
    mode = "capsize";
  } else if (css.getPropertyValue("text-box-trim") === "trim-both") {
    mode = "native";
  }

  return mode;
};

const clippedRect = (element: Element): Rect | undefined => {
  const rect = element.getBoundingClientRect();

  let top = Math.max(0, rect.top);
  let left = Math.max(0, rect.left);

  let bottom = Math.min(window.innerHeight, rect.bottom);
  let right = Math.min(window.innerWidth, rect.right);

  for (
    let parent: Element | null = element.parentElement;
    parent;
    parent =
      parent.parentElement ??
      (parent.getRootNode() instanceof ShadowRoot
        ? (parent.getRootNode() as ShadowRoot).host
        : null)
  ) {
    const css = getComputedStyle(parent);
    const bounds = parent.getBoundingClientRect();

    if (["auto", "scroll", "hidden", "clip"].includes(css.overflowX)) {
      left = Math.max(left, bounds.left + parent.clientLeft);
      right = Math.min(
        right,
        bounds.left + parent.clientLeft + parent.clientWidth
      );
    }

    if (["auto", "scroll", "hidden", "clip"].includes(css.overflowY)) {
      top = Math.max(top, bounds.top + parent.clientTop);
      bottom = Math.min(
        bottom,
        bounds.top + parent.clientTop + parent.clientHeight
      );
    }
  }

  if (
    right <= left ||
    bottom <= top ||
    getComputedStyle(element).visibility === "hidden"
  ) {
    return undefined;
  }

  return { height: bottom - top, left, top, width: right - left };
};

export const ArticleContentOverlay = ({
  revision,
  enabled,
  onEnabledChange,
}: {
  revision: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) => {
  const { displayFont, readingFont } = useEditorialFontPreference();
  const [fontGuides, setFontGuides] = useState(true);
  const [boxes, setBoxes] = useState<ContentBox[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [edges, setEdges] = useState<number[]>([]);

  const [fonts, setFonts] = useState(
    new Map<HTMLElement, FontSource | undefined>()
  );

  const [contentVersion, setContentVersion] = useState(0);
  const articleRef = useRef<HTMLElement | null>(null);

  const measurements = useRef(
    new WeakMap<
      HTMLElement,
      { key: string; box: ReturnType<typeof measureBox> }
    >()
  );

  const { requestFrame } = useAnimationFrame(() => {
    const article = articleRef.current;

    if (!enabled || !article) {
      return false;
    }

    const texts = textBlocks(article);

    const elements = new Set<Element>([
      ...contentRoots(article).flatMap((root) => [
        ...root.querySelectorAll(boxSelector),
      ]),
      ...texts,
    ]);

    const nextBoxes: ContentBox[] = [];
    const nextGuides: Guide[] = [];

    let index = 0;

    for (const element of elements) {
      if (element.closest("[data-typography-probe]")) {
        continue;
      }

      const clip = clippedRect(element);

      if (!clip) {
        continue;
      }

      const key = String((index += 1));
      nextBoxes.push({
        ...clip,
        key,
        label: `${element.tagName.toLowerCase()} · ${element.getBoundingClientRect().width.toFixed(0)}px`,
      });
    }

    if (fontGuides) {
      for (const element of texts) {
        const clip = clippedRect(element);
        const font = fonts.get(element);

        if (!clip || !font?.verified) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        const css = getComputedStyle(element);

        const key = `${rect.width}/${css.fontSize}/${css.lineHeight}/${css.fontWeight}/${css.fontStyle}/${css.letterSpacing}/${css.padding}/${css.border}/${css.getPropertyValue("text-box-trim")}/${revision}/${element.textContent}`;
        let measured = measurements.current.get(element);

        if (measured?.key !== key) {
          const mode = trimModeForElement(element, css);

          measured = { box: measureBox(element, mode, font), key };
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
              rect.top + line.baseline + fontGuideOffset(kind, metrics);

            const left = Math.max(clip.left, rect.left + line.left);

            const right = Math.min(
              clip.left + clip.width,
              rect.left + line.left + line.width
            );

            if (
              top >= clip.top &&
              top <= clip.top + clip.height &&
              right > left
            ) {
              nextGuides.push({
                height: 0,
                key: `${texts.indexOf(element)}-${lineIndex}-${kind}`,
                kind,
                left,
                top,
                width: right - left,
              });
            }
          }
        }
      }
    }

    const prose = article
      .querySelector(
        ".ui-article-prose > p, .ui-article-prose > h2, .ui-article-prose > figure"
      )
      ?.getBoundingClientRect();

    setEdges(prose ? [prose.left, prose.right] : []);
    setBoxes(nextBoxes);
    setGuides(nextGuides);

    return false;
  });

  // reconnect when newly loaded components add shadow roots
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const article = document.querySelector<HTMLElement>(
      ".ui-article-typography > article"
    );

    articleRef.current = article;

    if (!article) {
      return;
    }

    // The shared hooks have no DOM mutation observer. Ignore measurement clones
    // so asynchronously loaded figures can refresh without an observation loop.
    const observer = new MutationObserver((records) => {
      const changes = records.filter((record) => {
        const target =
          record.target instanceof Element
            ? record.target
            : record.target.parentElement;

        if (target?.closest("[data-typography-probe]")) {
          return false;
        }

        if (record.type !== "childList") {
          return true;
        }

        return [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            !(
              node instanceof HTMLElement &&
              Object.hasOwn(node.dataset, "typographyProbe")
            )
        );
      });

      if (changes.length) {
        requestFrame();
      }

      if (changes.some((record) => record.type !== "attributes")) {
        setContentVersion((value) => value + 1);
      }
    });

    for (const root of contentRoots(article)) {
      observer.observe(root, {
        attributeFilter: [
          "transform",
          "x",
          "y",
          "width",
          "height",
          "viewBox",
          "hidden",
        ],
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    requestFrame();

    return () => {
      observer.disconnect();
      articleRef.current = null;
    };
  }, [enabled, contentVersion, requestFrame]);

  // font tokens and dynamic article content restart exact-asset resolution
  useEffect(() => {
    const article = articleRef.current;

    if (!enabled || !article) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      await document.fonts.ready;

      if (controller.signal.aborted || !article) {
        return;
      }

      const resolved = await Promise.all(
        textBlocks(article).map(async (element) => {
          const font = await resolveFont(element, controller.signal).catch(
            (): undefined => undefined
          );

          return [element, font] as const;
        })
      );

      if (controller.signal.aborted) {
        return;
      }

      measurements.current = new WeakMap();
      setFonts(new Map(resolved));
      requestFrame();
    };

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
                    height: box.height,
                    left: box.left,
                    top: box.top,
                    width: box.width,
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
                    left: guide.left,
                    top: guide.top,
                    width: guide.width,
                  }}
                />
              ))}
            </div>,
            document.body
          )}
        </>
      ) : null}
    </div>
  );
};
