"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultDisplayFont,
  defaultReadingFont,
  displayStorageKey,
  type EditorialFontId,
  type EntryFontId,
  entryFontOptions,
  entryStorageKey,
  isEditorialFontId,
  isEntryFontId,
  readingStorageKey,
} from "./editorial-fonts";

type EditorialFontPreferenceValue = {
  entryFont: EntryFontId;
  selectEntryFont: (font: EntryFontId) => void;
  displayFont: EditorialFontId;
  readingFont: EditorialFontId;
  selectDisplayFont: (font: EditorialFontId) => void;
  selectReadingFont: (font: EditorialFontId) => void;
};

const EditorialFontPreferenceContext =
  createContext<EditorialFontPreferenceValue | null>(null);

function applyDisplayFont(font: EditorialFontId) {
  document.documentElement.dataset.editorialDisplayFont = font;
}

function applyReadingFont(font: EditorialFontId) {
  document.documentElement.dataset.editorialReadingFont = font;
}

function applyEntryFont(font: EntryFontId) {
  const option = entryFontOptions.find((option) => option.id === font);
  if (option) {
    document.documentElement.style.setProperty(
      "--home-entry-font",
      option.family,
    );
  }
}

// Keep storage reads after hydration so the first client render matches the server.
// Callers supply module-level validators and DOM setters to keep effects stable.
function useFontPreference<T extends string>(
  storageKey: string,
  defaultFont: T,
  isFont: (value: string | null) => value is T,
  applyFont: (font: T) => void,
) {
  const [font, setFont] = useState(defaultFont);

  useEffect(() => {
    let initialFont = defaultFont;
    try {
      const storedFont = window.localStorage.getItem(storageKey);
      if (isFont(storedFont)) initialFont = storedFont;
    } catch {
      // Use the default when storage is unavailable.
    }
    setFont(initialFont);
    applyFont(initialFont);
  }, [storageKey, defaultFont, isFont, applyFont]);

  const selectFont = useCallback(
    (nextFont: T) => {
      setFont(nextFont);
      applyFont(nextFont);
      try {
        window.localStorage.setItem(storageKey, nextFont);
      } catch {
        // The active page still updates when storage is unavailable.
      }
    },
    [storageKey, applyFont],
  );

  return [font, selectFont] as const;
}

export function EditorialFontPreference({ children }: { children: ReactNode }) {
  const [entryFont, selectEntryFont] = useFontPreference<EntryFontId>(
    entryStorageKey,
    "system",
    isEntryFontId,
    applyEntryFont,
  );
  const [displayFont, selectDisplayFont] = useFontPreference(
    displayStorageKey,
    defaultDisplayFont,
    isEditorialFontId,
    applyDisplayFont,
  );
  const [readingFont, selectReadingFont] = useFontPreference(
    readingStorageKey,
    defaultReadingFont,
    isEditorialFontId,
    applyReadingFont,
  );

  const value = useMemo(
    () => ({
      entryFont,
      selectEntryFont,
      displayFont,
      readingFont,
      selectDisplayFont,
      selectReadingFont,
    }),
    [
      displayFont,
      readingFont,
      selectDisplayFont,
      selectReadingFont,
      entryFont,
      selectEntryFont,
    ],
  );

  return (
    <EditorialFontPreferenceContext value={value}>
      {children}
    </EditorialFontPreferenceContext>
  );
}

export function useEditorialFontPreference() {
  const preference = useContext(EditorialFontPreferenceContext);
  if (!preference) {
    throw new Error(
      "useEditorialFontPreference must be used within EditorialFontPreference",
    );
  }

  return preference;
}
