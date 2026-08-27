"use client";

import { useId } from "react";
import {
  editorialFontOptions,
  type EditorialFontId,
} from "./editorial-fonts";
import { useEditorialFontPreference } from "./editorial-font-preference";
import styles from "./editorial-font-switcher.module.css";

export function EditorialFontSwitcher() {
  const displaySelectId = useId();
  const readingSelectId = useId();
  const {
    displayFont,
    readingFont,
    selectDisplayFont,
    selectReadingFont,
  } = useEditorialFontPreference();

  return (
    <aside aria-label="Typography preview" className={styles.switcher}>
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
    </aside>
  );
}
