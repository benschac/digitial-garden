"use client";

import {
  Typography,
  typographyVariants,
} from "@personal-site/ui/components/typography";
import { CanvasSpace, Group, Pt } from "pts";
import { useEffect, useRef, useState } from "react";
import {
  addVectors,
  angleBetweenVectors,
  crossVectors,
  divideVector,
  dotVectors,
  lerpVectors,
  limitVector,
  multiplyVector,
  normalizeVector,
  randomVector2D,
  randomVector3D,
  rotateVector,
  setVectorMagnitude,
  subtractVectors,
  type Vector,
  vectorDistance,
  vectorHeading,
  vectorMagnitude,
} from "./vector-math";
import styles from "./vector-math.module.css";

type OperationId =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "magnitude"
  | "setMagnitude"
  | "normalize"
  | "limit"
  | "heading"
  | "rotate"
  | "lerp"
  | "distance"
  | "angleBetween"
  | "dot"
  | "cross"
  | "random2D"
  | "random3D";

type OperationResult =
  | { expression: string; kind: "scalar"; unit?: string; value: number }
  | { expression: string; kind: "vector"; value: Vector }
  | { expression: string; kind: "warning"; value: string };

type Parameter = {
  label: string;
  max: number;
  min: number;
  step: number;
  suffix?: string;
};

const DEFAULT_FIRST: Vector = { x: 5, y: 2, z: 0 };
const DEFAULT_SECOND: Vector = { x: 3, y: 4, z: 0 };
const GRID_RANGE = 7;

const OPERATIONS: Array<{
  description: string;
  id: OperationId;
  label: string;
  parameter?: Parameter;
  usesSecond?: boolean;
}> = [
  { id: "add", label: "add()", description: "Add v to u", usesSecond: true },
  {
    id: "subtract",
    label: "sub()",
    description: "Subtract v from u",
    usesSecond: true,
  },
  {
    id: "multiply",
    label: "mult()",
    description: "Scale u by multiplication",
    parameter: { label: "Scalar", min: -3, max: 3, step: 0.1 },
  },
  {
    id: "divide",
    label: "div()",
    description: "Scale u by division",
    parameter: { label: "Divisor", min: -3, max: 3, step: 0.1 },
  },
  { id: "magnitude", label: "mag()", description: "Measure the length of u" },
  {
    id: "setMagnitude",
    label: "setMag()",
    description: "Give u an exact length",
    parameter: { label: "New magnitude", min: 0, max: 8, step: 0.1 },
  },
  {
    id: "normalize",
    label: "normalize()",
    description: "Make u one unit long",
  },
  {
    id: "limit",
    label: "limit()",
    description: "Cap the length of u",
    parameter: { label: "Maximum magnitude", min: 0, max: 8, step: 0.1 },
  },
  {
    id: "heading",
    label: "heading()",
    description: "Measure u's 2D direction",
  },
  {
    id: "rotate",
    label: "rotate()",
    description: "Turn u around the origin",
    parameter: { label: "Rotation", min: -180, max: 180, step: 1, suffix: "°" },
  },
  {
    id: "lerp",
    label: "lerp()",
    description: "Interpolate from u to v",
    usesSecond: true,
    parameter: { label: "Amount", min: 0, max: 1, step: 0.01 },
  },
  {
    id: "distance",
    label: "dist()",
    description: "Euclidean distance from u to v",
    usesSecond: true,
  },
  {
    id: "angleBetween",
    label: "angleBetween()",
    description: "Angle separating u and v",
    usesSecond: true,
  },
  {
    id: "dot",
    label: "dot()",
    description: "Dot product of u and v",
    usesSecond: true,
  },
  {
    id: "cross",
    label: "cross()",
    description: "3D vector perpendicular to u and v",
    usesSecond: true,
  },
  {
    id: "random2D",
    label: "random2D()",
    description: "Generate a random 2D unit vector",
  },
  {
    id: "random3D",
    label: "random3D()",
    description: "Generate a random 3D unit vector",
  },
];

export function VectorPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<"first" | "second" | null>(null);
  const [first, setFirst] = useState(DEFAULT_FIRST);
  const [second, setSecond] = useState(DEFAULT_SECOND);
  const [operation, setOperation] = useState<OperationId>("subtract");
  const [parameter, setParameter] = useState(2);
  const operationMeta =
    OPERATIONS.find((item) => item.id === operation) ?? OPERATIONS[0];
  const result = evaluateOperation(operation, first, second, parameter);
  const visualRef = useRef({ first, operation, result, second });
  visualRef.current = { first, operation, result, second };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const space = new CanvasSpace(canvas).setup({
      bgcolor: "#171915",
      resize: true,
      retina: true,
    });
    const form = space.getForm();

    space.add(() => {
      const snapshot = visualRef.current;
      const origin = space.center;
      const scale = Math.min(space.size.x / 16, space.size.y / 12);
      const toCanvas = (vector: Vector) =>
        new Pt(origin.x + vector.x * scale, origin.y - vector.y * scale);
      const firstPoint = toCanvas(snapshot.first);
      const secondPoint = toCanvas(snapshot.second);

      form.strokeOnly("#34372f", 1);
      for (let step = -GRID_RANGE; step <= GRID_RANGE; step += 1) {
        form.line(
          new Group(
            new Pt(origin.x + step * scale, 0),
            new Pt(origin.x + step * scale, space.size.y),
          ),
        );
        form.line(
          new Group(
            new Pt(0, origin.y + step * scale),
            new Pt(space.size.x, origin.y + step * scale),
          ),
        );
      }
      form.strokeOnly("#73786b", 1.5);
      form.line(new Group(new Pt(0, origin.y), new Pt(space.size.x, origin.y)));
      form.line(new Group(new Pt(origin.x, 0), new Pt(origin.x, space.size.y)));

      drawArrow(form, origin, firstPoint, "#f1b84b", 4);
      form.fillOnly("#f1b84b").point(firstPoint, 9, "circle");
      if (operationUsesSecond(snapshot.operation)) {
        drawArrow(form, origin, secondPoint, "#62b6cb", 4);
        form.fillOnly("#62b6cb").point(secondPoint, 9, "circle");
      }

      if (
        snapshot.result.kind === "vector" &&
        !snapshot.operation.startsWith("random")
      ) {
        const resultPoint = toCanvas(snapshot.result.value);
        drawArrow(form, origin, resultPoint, "#f4eee0", 5);
        form.fillOnly("#f4eee0").point(resultPoint, 6, "circle");
        if (snapshot.operation === "add" || snapshot.operation === "subtract") {
          drawArrow(form, firstPoint, resultPoint, "#8d9185", 2);
        }
      }

      if (snapshot.operation === "lerp" || snapshot.operation === "distance") {
        form.strokeOnly("#8d9185", 2).line(new Group(firstPoint, secondPoint));
      }
    });

    space.play();
    return () => {
      space.dispose();
    };
  }, []);

  const updateFromPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const target = draggingRef.current;
    if (!target) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(bounds.width / 16, bounds.height / 12);
    const update = target === "first" ? setFirst : setSecond;
    update((current) => ({
      x: clamp((event.clientX - bounds.left - bounds.width / 2) / scale),
      y: clamp(-(event.clientY - bounds.top - bounds.height / 2) / scale),
      z: current.z,
    }));
  };

  const chooseOperation = (next: OperationId) => {
    setOperation(next);
    const meta = OPERATIONS.find((item) => item.id === next);
    if (meta?.parameter) setParameter(defaultParameter(next));
    if (next === "random2D") setFirst(randomVector2D());
    if (next === "random3D") setFirst(randomVector3D());
  };

  return (
    <section className={styles.experiment} aria-labelledby="playground-title">
      <div className={styles.experimentHeader}>
        <div>
          <Typography
            as="p"
            variant="experimentKicker"
            className={styles.kicker}
          >
            p5.Vector method atlas
          </Typography>
          <Typography as="h2" variant="experimentHeading" id="playground-title">
            One vector. Seventeen ways to see it.
          </Typography>
        </div>
        <Typography
          as="p"
          variant="experimentStatus"
          className={styles.methodCount}
        >
          17 methods · live
        </Typography>
      </div>

      <nav
        aria-label="Vector methods"
        className={typographyVariants({
          variant: "experimentVectorMethodGrid",
          className: styles.methodGrid,
        })}
      >
        {OPERATIONS.map((item) => (
          <button
            aria-current={operation === item.id ? "true" : undefined}
            key={item.id}
            onClick={() => chooseOperation(item.id)}
            type="button"
          >
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </button>
        ))}
      </nav>

      <div
        className={typographyVariants({
          variant: "experimentVectorActiveMethod",
          className: styles.activeMethod,
        })}
      >
        <div>
          <span>Selected method</span>
          <strong>{operationMeta.label}</strong>
          <Typography
            as="p"
            variant="experimentVectorActiveMethodDescription"
            className={styles.activeMethodDescription}
          >
            {operationMeta.description}
          </Typography>
        </div>
        {operationMeta.parameter ? (
          <label>
            <span>{operationMeta.parameter.label}</span>
            <input
              max={operationMeta.parameter.max}
              min={operationMeta.parameter.min}
              onChange={(event) =>
                setParameter(Number(event.currentTarget.value))
              }
              step={operationMeta.parameter.step}
              type="range"
              value={parameter}
            />
            <output>
              {format(parameter)}
              {operationMeta.parameter.suffix}
            </output>
          </label>
        ) : null}
        {operation.startsWith("random") ? (
          <button onClick={() => chooseOperation(operation)} type="button">
            Generate again
          </button>
        ) : null}
      </div>

      <div className={styles.workspace}>
        <canvas
          aria-label="Interactive XY projection of vectors u and v"
          className={styles.canvas}
          onPointerDown={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const scale = Math.min(bounds.width / 16, bounds.height / 12);
            const pointer = {
              x: (event.clientX - bounds.left - bounds.width / 2) / scale,
              y: -(event.clientY - bounds.top - bounds.height / 2) / scale,
            };
            const firstDistance = Math.hypot(
              pointer.x - first.x,
              pointer.y - first.y,
            );
            const secondDistance = Math.hypot(
              pointer.x - second.x,
              pointer.y - second.y,
            );
            draggingRef.current =
              operationMeta.usesSecond && secondDistance < firstDistance
                ? "second"
                : "first";
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromPointer(event);
          }}
          onPointerMove={updateFromPointer}
          onPointerUp={(event) => {
            draggingRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          ref={canvasRef}
        />

        <div className={styles.readout} aria-live="polite">
          <VectorCard color="yellow" label="u" vector={first} />
          {operationMeta.usesSecond ? (
            <VectorCard color="blue" label="v" vector={second} />
          ) : null}
          <ResultCard method={operationMeta.label} result={result} />
        </div>
      </div>

      <div
        className={typographyVariants({
          variant: "experimentVectorKeyboardControls",
          className: styles.keyboardControls,
        })}
      >
        <VectorControls label="Vector u" setVector={setFirst} vector={first} />
        {operationMeta.usesSecond ? (
          <VectorControls
            label="Vector v"
            setVector={setSecond}
            vector={second}
          />
        ) : null}
      </div>

      <div
        className={typographyVariants({
          variant: "experimentVectorFooterBar",
          className: styles.footerBar,
        })}
      >
        <p>Canvas shows the XY projection · sliders include Z</p>
        <button
          onClick={() => {
            setFirst(DEFAULT_FIRST);
            setSecond(DEFAULT_SECOND);
          }}
          type="button"
        >
          Reset vectors
        </button>
      </div>
    </section>
  );
}

function evaluateOperation(
  operation: OperationId,
  u: Vector,
  v: Vector,
  parameter: number,
): OperationResult {
  switch (operation) {
    case "add":
      return vectorResult("u + v", addVectors(u, v));
    case "subtract":
      return vectorResult("u − v", subtractVectors(u, v));
    case "multiply":
      return vectorResult(
        `u × ${format(parameter)}`,
        multiplyVector(u, parameter),
      );
    case "divide":
      return parameter === 0
        ? {
            kind: "warning",
            value: "Division by zero is undefined.",
            expression: "u ÷ 0",
          }
        : vectorResult(`u ÷ ${format(parameter)}`, divideVector(u, parameter));
    case "magnitude":
      return scalarResult("√(x² + y² + z²)", vectorMagnitude(u));
    case "setMagnitude":
      return vectorResult(
        `|u| = ${format(parameter)}`,
        setVectorMagnitude(u, parameter),
      );
    case "normalize":
      return vectorResult("u ÷ |u|", normalizeVector(u));
    case "limit":
      return vectorResult(
        `min(|u|, ${format(parameter)})`,
        limitVector(u, parameter),
      );
    case "heading":
      return scalarResult("atan2(y, x)", vectorHeading(u), "°");
    case "rotate":
      return vectorResult(
        `rotate u by ${format(parameter)}°`,
        rotateVector(u, parameter),
      );
    case "lerp":
      return vectorResult(
        `u + (v − u) × ${format(parameter)}`,
        lerpVectors(u, v, parameter),
      );
    case "distance":
      return scalarResult("|u − v|", vectorDistance(u, v));
    case "angleBetween":
      return scalarResult(
        "acos((u · v) ÷ (|u||v|))",
        angleBetweenVectors(u, v),
        "°",
      );
    case "dot":
      return scalarResult("uₓvₓ + uᵧvᵧ + u_zv_z", dotVectors(u, v));
    case "cross":
      return vectorResult("u × v", crossVectors(u, v));
    case "random2D":
      return vectorResult("random unit direction in XY", u);
    case "random3D":
      return vectorResult("random unit direction on a sphere", u);
  }
}

const vectorResult = (expression: string, value: Vector): OperationResult => ({
  expression,
  kind: "vector",
  value,
});
const scalarResult = (
  expression: string,
  value: number,
  unit?: string,
): OperationResult => ({ expression, kind: "scalar", unit, value });
const operationUsesSecond = (operation: OperationId) =>
  OPERATIONS.find((item) => item.id === operation)?.usesSecond ?? false;

function ResultCard({
  method,
  result,
}: {
  method: string;
  result: OperationResult;
}) {
  return (
    <article
      className={typographyVariants({
        variant: "experimentVectorResultCard",
        className: styles.resultCard,
      })}
    >
      <span>{method} result</span>
      {result.kind === "vector" ? (
        <strong>{formatVector(result.value)}</strong>
      ) : null}
      {result.kind === "scalar" ? (
        <strong>
          {result.value.toFixed(2)}
          {result.unit}
        </strong>
      ) : null}
      {result.kind === "warning" ? (
        <Typography
          as="strong"
          variant="experimentVectorWarning"
          className={styles.warning}
        >
          {result.value}
        </Typography>
      ) : null}
      <small>{result.expression}</small>
      {result.kind === "vector" ? (
        <small>magnitude {vectorMagnitude(result.value).toFixed(2)}</small>
      ) : null}
    </article>
  );
}

function VectorControls({
  label,
  setVector,
  vector,
}: {
  label: string;
  setVector: React.Dispatch<React.SetStateAction<Vector>>;
  vector: Vector;
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      {(["x", "y", "z"] as const).map((axis) => (
        <label key={axis}>
          <span>{axis}</span>
          <input
            max="7"
            min="-7"
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              setVector((current) => ({ ...current, [axis]: value }));
            }}
            step="0.1"
            type="range"
            value={vector[axis]}
          />
          <output>{format(vector[axis])}</output>
        </label>
      ))}
    </fieldset>
  );
}

function VectorCard({
  color,
  label,
  vector,
}: {
  color: "blue" | "yellow";
  label: string;
  vector: Vector;
}) {
  return (
    <article
      className={typographyVariants({
        variant: "experimentVectorCard",
        className: styles.vectorCard,
      })}
      data-color={color}
    >
      <span>{label}</span>
      <strong>{formatVector(vector)}</strong>
      <small>
        |{label}| {vectorMagnitude(vector).toFixed(2)} · XY heading{" "}
        {vectorHeading(vector).toFixed(0)}°
      </small>
    </article>
  );
}

function drawArrow(
  form: ReturnType<CanvasSpace["getForm"]>,
  start: Pt,
  end: Pt,
  color: string,
  width: number,
) {
  form.strokeOnly(color, width).line(new Group(start, end));
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const size = 13;
  const left = new Pt(
    end.x - Math.cos(angle - Math.PI / 6) * size,
    end.y - Math.sin(angle - Math.PI / 6) * size,
  );
  const right = new Pt(
    end.x - Math.cos(angle + Math.PI / 6) * size,
    end.y - Math.sin(angle + Math.PI / 6) * size,
  );
  form.fillOnly(color).polygon(new Group(end, left, right));
}

const DEFAULT_PARAMETERS: Partial<Record<OperationId, number>> = {
  divide: 2,
  lerp: 0.5,
  limit: 3,
  multiply: 2,
  rotate: 45,
  setMagnitude: 3,
};
const defaultParameter = (operation: OperationId) =>
  DEFAULT_PARAMETERS[operation] ?? 2;
const clamp = (value: number) =>
  Math.round(Math.max(-7, Math.min(7, value)) * 10) / 10;
const format = (value: number) =>
  Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(2).replace(/0$/, "");
const formatVector = (vector: Vector) =>
  `(${format(vector.x)}, ${format(vector.y)}, ${format(vector.z)})`;
