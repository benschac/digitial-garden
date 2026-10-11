"use client";

import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { Typography, typographyVariants } from "@/components/page-typography";
import { useEditorialFontPreference } from "./editorial-font-preference";
import styles from "./editorial-font-switcher-styles";
import {
  type EditorialFontId,
  type EntryFontId,
  editorialFontOptions,
  entryFontOptions,
} from "./editorial-fonts";
import { TypographyInspector } from "./typography-inspector";

export function EditorialFontSwitcher() {
  const pathname = usePathname();
  const displaySelectId = useId();
  const readingSelectId = useId();
  const entrySelectId = useId();
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const {
    displayFont,
    readingFont,
    selectDisplayFont,
    selectReadingFont,
    entryFont,
    selectEntryFont,
  } = useEditorialFontPreference();

  // Chat uses UI fonts and reserves the bottom of the viewport for its composer.
  if (pathname === "/s" || pathname.startsWith("/s/")) {
    return null;
  }

  return (
    <aside
      aria-label="Typography preview"
      className={typographyVariants({
        variant: "ui",
        className: styles.switcher,
      })}
      style={{ viewTransitionName: "typography-preview" }}
    >
      <button
        className={styles.toggle}
        type="button"
        aria-expanded={isOpen && !isMinimized}
        aria-controls={panelId}
        onClick={() => {
          if (isMinimized) setIsMinimized(false);
          else setIsOpen(!isOpen);
        }}
      >
        {isMinimized
          ? "Show typography"
          : isOpen
            ? "Close typography"
            : "Typography"}
      </button>
      {isMinimized ? (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => {
            setIsMinimized(false);
            setIsOpen(false);
          }}
        >
          Reset preview
        </button>
      ) : null}
      <div
        id={panelId}
        className={styles.controls}
        hidden={!isOpen || isMinimized}
      >
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
            <select
              className={styles.select}
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
            </select>
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
        <select
          className={styles.select}
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
        </select>
        <Typography
          as="label"
          variant="previewLabel"
          className={styles.label}
          htmlFor={readingSelectId}
        >
          Reading
        </Typography>
        <select
          className={styles.select}
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
        </select>
        {isOpen && pathname.startsWith("/blog/") ? (
          <>
            <button
              type="button"
              className={`${styles.toggle} col-span-full`}
              onClick={() => setIsMinimized(true)}
            >
              Hide controls · keep preview
            </button>
            <TypographyInspector key={pathname} pathname={pathname} />
          </>
        ) : null}
      </div>
    </aside>
  );
}
