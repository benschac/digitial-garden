"use client";

import {
  useAnimationFrame,
  useDocumentEvent,
} from "@personal-site/react-hooks";
import { ALargeSmall, RotateCcw, X } from "lucide-react";
import { motion, MotionConfig, type Variants } from "motion/react";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";

import { Typography, typographyVariants } from "@/components/page-typography";

import { useEditorialFontPreference } from "./editorial-font-preference";
import styles from "./editorial-font-switcher-styles";
import {
  type EditorialFontId,
  editorialFontOptions,
  type EntryFontId,
  entryFontOptions,
} from "./editorial-fonts";
import { TypographyInspector } from "./typography-inspector";
import { InspectorSelect } from "./typography-inspector-select";

const panelVariants = {
  open: { opacity: 1, scale: 1, visibility: "visible" },
  closed: {
    opacity: 0,
    scale: 0.97,
    transitionEnd: { visibility: "hidden" },
  },
} satisfies Variants;

export function EditorialFontSwitcher() {
  const pathname = usePathname();
  return <TypographyPreview key={pathname} pathname={pathname} />;
}

function TypographyPreview({ pathname }: { pathname: string }) {
  const displaySelectId = useId();
  const readingSelectId = useId();
  const entrySelectId = useId();
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [contentOverlay, setContentOverlay] = useState(false);
  const [spacingOverlay, setSpacingOverlay] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [animatePanel, setAnimatePanel] = useState(true);
  const [animateInteraction, setAnimateInteraction] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isArticle = pathname.startsWith("/blog/");
  const isVisible = isOpen && !isMinimized;
  const toggleLabel = isOpen ? "Show typography" : "Typography";
  const { requestFrame: requestPanelFocus } = useAnimationFrame(() => {
    (isVisible ? closeRef : launcherRef).current?.focus();
    return false;
  });
  function closePanel(animate: boolean) {
    setAnimateInteraction(animate);
    if (isArticle) setIsMinimized(true);
    else setIsOpen(false);
    requestPanelFocus();
  }
  const {
    displayFont,
    readingFont,
    selectDisplayFont,
    selectReadingFont,
    entryFont,
    selectEntryFont,
  } = useEditorialFontPreference();

  useDocumentEvent("keydown", (event) => {
    if (
      event.key === "Escape" &&
      isVisible &&
      !event.defaultPrevented &&
      !event.isComposing
    ) {
      event.preventDefault();
      closePanel(false);
      return;
    }
    if (
      !isArticle ||
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      event.altKey ||
      !(event.metaKey || event.ctrlKey) ||
      !event.shiftKey ||
      event.key.toLowerCase() !== "u"
    )
      return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest("input, textarea, select"))
    )
      return;
    event.preventDefault();
    const enabled = !(contentOverlay && spacingOverlay);
    setContentOverlay(enabled);
    setSpacingOverlay(enabled);
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(true);
    }
  });

  // Chat uses UI fonts and reserves the bottom of the viewport for its composer.
  if (pathname === "/s" || pathname.startsWith("/s/")) {
    return null;
  }

  return (
    <MotionConfig reducedMotion="user">
      <aside
        aria-label="Typography preview"
        className={typographyVariants({
          variant: "ui",
          className: styles.switcher,
        })}
        style={{ viewTransitionName: "typography-preview" }}
      >
        <div className={styles.launcher} hidden={isVisible}>
          <button
            ref={launcherRef}
            className={styles.iconToggle}
            type="button"
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-expanded={false}
            data-cuelume-open="open"
            data-cuelume-emphasis="subtle"
            aria-controls={panelId}
            onClick={(event) => {
              setAnimateInteraction(event.detail > 0);
              setIsMinimized(false);
              setIsOpen(true);
              requestPanelFocus();
            }}
          >
            <ALargeSmall aria-hidden="true" size={22} />
          </button>
        </div>
        <motion.div
          id={panelId}
          className={styles.surface}
          initial={false}
          animate={isVisible ? "open" : "closed"}
          variants={panelVariants}
          transition={{
            duration: animatePanel && animateInteraction ? 0.26 : 0,
            ease: [0.32, 0.72, 0, 1],
          }}
          data-open={isVisible}
          data-animated={animatePanel && animateInteraction}
          aria-hidden={!isVisible}
          inert={!isVisible}
        >
          <div className={styles.toolbar}>
            <strong className={styles.title}>Typography</strong>
            <label className={styles.animationToggle}>
              <input
                type="checkbox"
                role="switch"
                aria-label="Panel animation"
                aria-checked={animatePanel}
                checked={animatePanel}
                onChange={(event) => setAnimatePanel(event.target.checked)}
              />
              Animate
            </label>
            {isArticle ? (
              <button
                type="button"
                className={styles.iconToggle}
                aria-label="Reset preview"
                title="Reset preview"
                onClick={() => {
                  setContentOverlay(false);
                  setSpacingOverlay(false);
                  setPreviewRevision((revision) => revision + 1);
                }}
              >
                <RotateCcw aria-hidden="true" size={20} />
              </button>
            ) : null}
            <button
              ref={closeRef}
              className={styles.iconToggle}
              type="button"
              aria-label="Close typography"
              title="Close typography"
              aria-expanded={isVisible}
              aria-controls={panelId}
              data-cuelume-open="close"
              data-cuelume-emphasis="subtle"
              onClick={(event) => closePanel(event.detail > 0)}
            >
              <X aria-hidden="true" size={22} />
            </button>
          </div>
          <div className={styles.controls}>
            {isArticle ? (
              <p className={styles.shortcut}>
                Ctrl/⌘ + Shift + U toggles content overlays and spacing.
              </p>
            ) : null}
            {pathname === "/" ? (
              <>
                <Typography
                  as="label"
                  variant="previewLabel"
                  className={styles.label}
                  htmlFor={entrySelectId}
                >
                  Entry titles
                </Typography>
                <InspectorSelect
                  data-cuelume-select=""
                  data-cuelume-emphasis="subtle"
                  id={entrySelectId}
                  value={entryFont}
                  onChange={(event) =>
                    selectEntryFont(event.currentTarget.value as EntryFontId)
                  }
                >
                  {entryFontOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </InspectorSelect>
              </>
            ) : null}
            <Typography
              as="label"
              variant="previewLabel"
              className={styles.label}
              htmlFor={displaySelectId}
            >
              Display
            </Typography>
            <InspectorSelect
              data-cuelume-select=""
              data-cuelume-emphasis="subtle"
              id={displaySelectId}
              onChange={(event) =>
                selectDisplayFont(event.currentTarget.value as EditorialFontId)
              }
              value={displayFont}
            >
              {editorialFontOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </InspectorSelect>
            <Typography
              as="label"
              variant="previewLabel"
              className={styles.label}
              htmlFor={readingSelectId}
            >
              Reading
            </Typography>
            <InspectorSelect
              data-cuelume-select=""
              data-cuelume-emphasis="subtle"
              id={readingSelectId}
              onChange={(event) =>
                selectReadingFont(event.currentTarget.value as EditorialFontId)
              }
              value={readingFont}
            >
              {editorialFontOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </InspectorSelect>
            {isOpen && isArticle ? (
              <TypographyInspector
                key={previewRevision}
                pathname={pathname}
                contentOverlay={contentOverlay}
                onContentOverlayChange={setContentOverlay}
                spacingOverlay={spacingOverlay}
                onSpacingOverlayChange={setSpacingOverlay}
              />
            ) : null}
          </div>
        </motion.div>
      </aside>
    </MotionConfig>
  );
}
