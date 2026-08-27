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
  isEditorialFontId,
  readingStorageKey,
} from "./editorial-fonts";

type EditorialFontPreferenceValue = {
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

export function EditorialFontPreference({ children }: { children: ReactNode }) {
  const [displayFont, setDisplayFont] =
    useState<EditorialFontId>(defaultDisplayFont);
  const [readingFont, setReadingFont] =
    useState<EditorialFontId>(defaultReadingFont);

  useEffect(() => {
    try {
      const storedDisplayFont = window.localStorage.getItem(displayStorageKey);
      const storedReadingFont = window.localStorage.getItem(readingStorageKey);
      const initialDisplayFont = isEditorialFontId(storedDisplayFont)
        ? storedDisplayFont
        : defaultDisplayFont;
      const initialReadingFont = isEditorialFontId(storedReadingFont)
        ? storedReadingFont
        : defaultReadingFont;

      setDisplayFont(initialDisplayFont);
      setReadingFont(initialReadingFont);
      applyDisplayFont(initialDisplayFont);
      applyReadingFont(initialReadingFont);
    } catch {
      applyDisplayFont(defaultDisplayFont);
      applyReadingFont(defaultReadingFont);
    }
  }, []);

  const selectDisplayFont = useCallback((nextFont: EditorialFontId) => {
    setDisplayFont(nextFont);
    applyDisplayFont(nextFont);

    try {
      window.localStorage.setItem(displayStorageKey, nextFont);
    } catch {
      // The active page still updates when storage is unavailable.
    }
  }, []);

  const selectReadingFont = useCallback((nextFont: EditorialFontId) => {
    setReadingFont(nextFont);
    applyReadingFont(nextFont);

    try {
      window.localStorage.setItem(readingStorageKey, nextFont);
    } catch {
      // The active page still updates when storage is unavailable.
    }
  }, []);

  const value = useMemo(
    () => ({
      displayFont,
      readingFont,
      selectDisplayFont,
      selectReadingFont,
    }),
    [displayFont, readingFont, selectDisplayFont, selectReadingFont],
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
