/** Deckled-edge variants; seeds differ so neighbouring cards never tear alike. */
const deckles = [
  { seed: 3, frequency: 0.045, scale: 6 },
  { seed: 17, frequency: 0.06, scale: 5 },
  { seed: 29, frequency: 0.04, scale: 7 },
  { seed: 43, frequency: 0.055, scale: 6 },
] as const;

export const deckleFilterIds = deckles.map(
  (_, index) => `paper-deckle-${index + 1}`,
);

/**
 * Site-wide SVG filters, defined once and referenced by id from CSS. Apply them
 * only to small static decoration (never text or animated surfaces): each
 * filtered box is rasterized, and Safari repaints filters expensively.
 */
export function PaperFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", overflow: "hidden" }}
    >
      <defs>
        {deckles.map(({ seed, frequency, scale }, index) => (
          <filter
            key={seed}
            id={deckleFilterIds[index]}
            x="-3%"
            y="-5%"
            width="106%"
            height="110%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={frequency}
              numOctaves="4"
              seed={seed}
              result="fibres"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="fibres"
              scale={scale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
