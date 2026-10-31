const FRAME_DURATION = 1000 / 60;

/** Only animation-frame timestamps advance the simulation clock. */
export const frameProgress = (previous: number | null, current: number) => {
  const elapsed =
    previous === null
      ? FRAME_DURATION
      : Math.min(64, Math.max(1, current - previous));

  return 1 - 0.82 ** (elapsed / FRAME_DURATION);
};
