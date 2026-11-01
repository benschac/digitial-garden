const REFERENCE_FRAMES_PER_SECOND = 60;
const REFERENCE_TRAIL_ALPHA = 0.2;
const DEFAULT_DELTA_SECONDS = 1 / REFERENCE_FRAMES_PER_SECOND;
const MIN_DELTA_SECONDS = 1 / 240;
const MAX_DELTA_SECONDS = 1 / 24;

export const frameDeltaSeconds = (
  previousMilliseconds: number | null,
  milliseconds: number
) => {
  if (previousMilliseconds === null) {
    return DEFAULT_DELTA_SECONDS;
  }

  return Math.min(
    MAX_DELTA_SECONDS,
    Math.max(MIN_DELTA_SECONDS, (milliseconds - previousMilliseconds) / 1000)
  );
};

export const trailAlpha = (deltaSeconds: number) =>
  1 -
  (1 - REFERENCE_TRAIL_ALPHA) ** (deltaSeconds * REFERENCE_FRAMES_PER_SECOND);
