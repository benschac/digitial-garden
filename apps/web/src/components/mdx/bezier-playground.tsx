"use client";

import { useId, useState } from "react";

export function BezierPlayground() {
  const inputId = useId();
  const [bend, setBend] = useState(54);
  const controlY = 100 - bend;
  const path = `M 20 100 C 70 ${controlY}, 150 ${controlY}, 200 100`;

  return (
    <section className="bezier-playground" aria-labelledby={`${inputId}-title`}>
      <div className="bezier-playground__header">
        <h3 id={`${inputId}-title`}>Bezier curve playground</h3>
        <output htmlFor={inputId}>{bend}% bend</output>
      </div>
      <svg
        aria-label={`A cubic Bezier curve with ${bend} percent bend`}
        role="img"
        viewBox="0 0 220 125"
      >
        <line x1="20" x2="70" y1="100" y2={controlY} />
        <line x1="150" x2="200" y1={controlY} y2="100" />
        <path d={path} />
        <circle cx="20" cy="100" r="4" />
        <circle cx="70" cy={controlY} r="4" />
        <circle cx="150" cy={controlY} r="4" />
        <circle cx="200" cy="100" r="4" />
      </svg>
      <label htmlFor={inputId}>Curve bend</label>
      <input
        id={inputId}
        max="90"
        min="10"
        onChange={(event) => setBend(Number(event.currentTarget.value))}
        type="range"
        value={bend}
      />
      <p className="bezier-playground__fallback">
        The curve connects two fixed endpoints while both control points move
        vertically. The labeled slider changes their shared height.
      </p>
    </section>
  );
}
