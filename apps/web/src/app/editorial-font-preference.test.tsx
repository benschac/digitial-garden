import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import {
  EditorialFontPreference,
  useEditorialFontPreference,
} from "./editorial-font-preference";
import { defaultDisplayFont, defaultReadingFont } from "./editorial-fonts";

const FontSelection = () => {
  const { displayFont, entryFont, readingFont } = useEditorialFontPreference();

  return <output>{`${displayFont}/${readingFont}/${entryFont}`}</output>;
};

test("font preference server rendering uses hydration defaults without browser storage", () => {
  expect(
    renderToStaticMarkup(
      <EditorialFontPreference>
        <FontSelection />
      </EditorialFontPreference>
    )
  ).toBe(`<output>${defaultDisplayFont}/${defaultReadingFont}/system</output>`);
});
