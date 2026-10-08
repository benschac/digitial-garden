/** The same fixed inset lighting for HTML ink and SVG lettering. */
export function InkImpressionFilter({ id }: { id: string }) {
  return (
    <filter
      id={id}
      x="-5%"
      y="-5%"
      width="110%"
      height="110%"
      colorInterpolationFilters="sRGB"
    >
      <feOffset in="SourceAlpha" dx="0.35" dy="1.4" result="lowered" />
      <feComposite
        in="SourceAlpha"
        in2="lowered"
        operator="out"
        result="innerEdge"
      />
      <feGaussianBlur in="innerEdge" stdDeviation="0.2" result="softEdge" />
      <feComposite
        in="softEdge"
        in2="SourceAlpha"
        operator="in"
        result="insetMask"
      />
      <feFlood
        floodColor="#080604"
        style={{ floodOpacity: "var(--ink-impression-opacity, 1)" }}
        result="shadow"
      />
      <feComposite
        in="shadow"
        in2="insetMask"
        operator="in"
        result="insetShadow"
      />
      <feOffset in="SourceAlpha" dx="-0.25" dy="-0.6" result="raised" />
      <feComposite
        in="SourceAlpha"
        in2="raised"
        operator="out"
        result="highlightEdge"
      />
      <feFlood floodColor="#f8f5ee" floodOpacity="0.24" result="light" />
      <feComposite
        in="light"
        in2="highlightEdge"
        operator="in"
        result="insetHighlight"
      />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="insetShadow" />
        <feMergeNode in="insetHighlight" />
      </feMerge>
    </filter>
  );
}
