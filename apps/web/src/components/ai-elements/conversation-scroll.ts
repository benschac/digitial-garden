import * as Schema from "effect/Schema";

const scrollPositionSchema = Schema.Struct({
  atBottom: Schema.Boolean,
  scrollTop: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
});

type ScrollPosition = typeof scrollPositionSchema.Type;

const decodeScrollPosition = Schema.decodeUnknownSync(scrollPositionSchema);

export const readScrollPosition = (
  value: string | null
): ScrollPosition | undefined => {
  if (value === null) {
    return undefined;
  }

  try {
    return decodeScrollPosition(JSON.parse(value));
  } catch {
    return undefined;
  }
};

export const restoreScrollPosition = (
  storageKey: string
): ScrollPosition | undefined => {
  try {
    return readScrollPosition(sessionStorage.getItem(storageKey));
  } catch {
    return undefined;
  }
};

export const saveScrollPosition = (
  storageKey: string,
  position: ScrollPosition
) => {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(position));

    return true;
  } catch {
    return false;
  }
};
