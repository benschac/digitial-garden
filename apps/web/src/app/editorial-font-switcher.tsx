"use client";

import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { useEditorialFontPreference } from "./editorial-font-preference";
import styles from "./editorial-font-switcher.module.css";
import { type EditorialFontId, editorialFontOptions } from "./editorial-fonts";

export function EditorialFontSwitcher() {
  const pathname = usePathname();
  const displaySelectId = useId();
  const readingSelectId = useId();
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const { displayFont, readingFont, selectDisplayFont, selectReadingFont } =
    useEditorialFontPreference();

  // Chat uses UI fonts and reserves the bottom of the viewport for its composer.
  if (pathname === "/s" || pathname.startsWith("/s/")) {
    return null;
  }

  return (
    <aside
      aria-label="Typography preview"
      className={styles.switcher}
      style={{ viewTransitionName: "typography-preview" }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "Close typography" : "Typography"}
      </button>
      <div id={panelId} className={styles.controls} hidden={!isOpen}>
        <label htmlFor={displaySelectId}>Display</label>
        <select
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
        <label htmlFor={readingSelectId}>Reading</label>
        <select
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
      </div>
    </aside>
  );
}
