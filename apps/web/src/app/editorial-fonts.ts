export const editorialFontOptions = [
  { id: "newsreader", label: "Newsreader" },
  { id: "sorts-mill-goudy", label: "Sorts Mill Goudy" },
  { id: "superior-serif", label: "Superior Serif" },
  { id: "bonbance", label: "Bonbance" },
  { id: "goudy-bookletter", label: "Goudy Bookletter 1911" },
  { id: "libre-caslon-condensed", label: "Libre Caslon Condensed" },
  { id: "tenderness", label: "Tenderness" },
  { id: "iowan", label: "Iowan Old Style" },
  { id: "palatino", label: "Palatino" },
  { id: "georgia", label: "Georgia" },
] as const;

export type EditorialFontId = (typeof editorialFontOptions)[number]["id"];

export const defaultDisplayFont: EditorialFontId = "bonbance";
export const defaultReadingFont: EditorialFontId = "superior-serif";
export const displayStorageKey = "editorial-display-font-v2";
export const readingStorageKey = "editorial-reading-font-v3";

export function isEditorialFontId(
  value: string | null,
): value is EditorialFontId {
  return editorialFontOptions.some((option) => option.id === value);
}

const editorialFontIds = editorialFontOptions.map((option) => option.id);

export const editorialFontPreferenceInitScript = `
(() => {
  try {
    const allowedFonts = ${JSON.stringify(editorialFontIds)};
    const displayFont = window.localStorage.getItem(${JSON.stringify(displayStorageKey)});
    const readingFont = window.localStorage.getItem(${JSON.stringify(readingStorageKey)});
    const root = document.documentElement;

    root.dataset.editorialDisplayFont = allowedFonts.includes(displayFont)
      ? displayFont
      : ${JSON.stringify(defaultDisplayFont)};
    root.dataset.editorialReadingFont = allowedFonts.includes(readingFont)
      ? readingFont
      : ${JSON.stringify(defaultReadingFont)};
  } catch {
    // The CSS root tokens already contain the default font pair.
  }
})();
`;
