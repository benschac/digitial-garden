"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  defaultDisplayFont,
  defaultReadingFont,
  displayStorageKey,
  entryFontOptions,
  entryStorageKey,
  isEditorialFontId,
  isEntryFontId,
  readingStorageKey,
} from "./editorial-fonts";
import type { EditorialFontId, EntryFontId } from "./editorial-fonts";

interface EditorialFontPreferenceValue {
  entryFont: EntryFontId;
  selectEntryFont: (font: EntryFontId) => void;
  displayFont: EditorialFontId;
  readingFont: EditorialFontId;
  selectDisplayFont: (font: EditorialFontId) => void;
  selectReadingFont: (font: EditorialFontId) => void;
}

const EditorialFontPreferenceContext =
  createContext<EditorialFontPreferenceValue | null>(null);

const applyDisplayFont = (font: EditorialFontId) => {
  document.documentElement.dataset.editorialDisplayFont = font;
};

const applyReadingFont = (font: EditorialFontId) => {
  document.documentElement.dataset.editorialReadingFont = font;
};

const applyEntryFont = (font: EntryFontId) => {
  const option = entryFontOptions.find((candidate) => candidate.id === font);

  if (option) {
    document.documentElement.style.setProperty(
      "--home-entry-font",
      option.family
    );
  }
};

// Keep storage reads after hydration so the first client render matches the server.
// Callers supply module-level validators and DOM setters to keep effects stable.
const subscribeToFontStorage = (listener: () => void) => {
  window.addEventListener("storage", listener);

  return () => window.removeEventListener("storage", listener);
};

const useFontPreference = <T extends string>(
  storageKey: string,
  defaultFont: T,
  isFont: (value: string | null) => value is T,
  applyFont: (font: T) => void
) => {
  const [selectedFont, setSelectedFont] = useState<T>();

  const storedFont = useSyncExternalStore(
    subscribeToFontStorage,
    () => {
      try {
        const value = window.localStorage.getItem(storageKey);

        return isFont(value) ? value : defaultFont;
      } catch {
        return defaultFont;
      }
    },
    () => defaultFont
  );

  const font = selectedFont ?? storedFont;

  useEffect(() => {
    applyFont(font);
  }, [font, applyFont]);

  const selectFont = useCallback(
    (nextFont: T) => {
      setSelectedFont(nextFont);
      applyFont(nextFont);

      try {
        window.localStorage.setItem(storageKey, nextFont);

        return true;
      } catch {
        return false;
      }
    },
    [storageKey, applyFont]
  );

  return [font, selectFont] as const;
};

export const EditorialFontPreference = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [entryFont, selectEntryFont] = useFontPreference<EntryFontId>(
    entryStorageKey,
    "system",
    isEntryFontId,
    applyEntryFont
  );

  const [displayFont, selectDisplayFont] = useFontPreference(
    displayStorageKey,
    defaultDisplayFont,
    isEditorialFontId,
    applyDisplayFont
  );

  const [readingFont, selectReadingFont] = useFontPreference(
    readingStorageKey,
    defaultReadingFont,
    isEditorialFontId,
    applyReadingFont
  );

  const value = useMemo(
    () => ({
      displayFont,
      entryFont,
      readingFont,
      selectDisplayFont,
      selectEntryFont,
      selectReadingFont,
    }),
    [
      displayFont,
      readingFont,
      selectDisplayFont,
      selectReadingFont,
      entryFont,
      selectEntryFont,
    ]
  );

  return (
    <EditorialFontPreferenceContext value={value}>
      {children}
    </EditorialFontPreferenceContext>
  );
};

export const useEditorialFontPreference = () => {
  const preference = useContext(EditorialFontPreferenceContext);

  if (!preference) {
    throw new Error(
      "useEditorialFontPreference must be used within EditorialFontPreference"
    );
  }

  return preference;
};
