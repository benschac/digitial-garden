"use client";

import {
  canvasTypography,
  Typography,
  typographyVariants,
} from "@personal-site/ui/components/typography";
import { useEffect, useRef, useState } from "react";
import styles from "./forces.module.css";
import {
  acceleration,
  advancePosition,
  velocitiesAfterImpulse,
} from "./forces-model";

type Law = "first" | "second" | "third";

const LAW_LABELS: Record<Law, string> = {
  first: "First law",
  second: "Second law",
  third: "Third law",
};

const COLORS = {
  blue: "#60a5fa",
  coral: "#fb7185",
  cream: "#f6f0df",
  green: "#86efac",
  muted: "#7b8494",
  yellow: "#facc15",
};

export function ForcesExperiment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const [law, setLaw] = useState<Law>("first");
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [speed, setSpeed] = useState(2);
  const [force, setForce] = useState(12);
  const [mass, setMass] = useState(4);
  const [firstMass, setFirstMass] = useState(3);
  const [secondMass, setSecondMass] = useState(6);
  const [pushed, setPushed] = useState(false);
  const [telemetry, setTelemetry] = useState({
    primary: "2.00 m/s",
    secondary: "0 N net force",
  });
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let previousTime = performance.now();
    let lastTelemetryUpdate = 0;
    let width = 1;
    let height = 1;
    let firstPosition = 0.16;
    const firstVelocity = speed;
    let secondPosition = 0.12;
    let secondVelocity = 0;
    let bodyAPosition = 0.45;
    let bodyBPosition = 0.55;
    const interactionVelocity = pushed
      ? velocitiesAfterImpulse(9, firstMass, secondMass)
      : { first: 0, second: 0 };
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Reading the reset token intentionally restarts this effect's local model.
    void resetKey;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (time: number) => {
      const deltaSeconds = Math.min((time - previousTime) / 1_000, 0.04);
      previousTime = time;

      if (!pausedRef.current && !prefersReducedMotion) {
        if (law === "first") {
          firstPosition = advancePosition(
            firstPosition,
            firstVelocity * 0.065,
            deltaSeconds,
          );
          if (firstPosition > 1.08) firstPosition = -0.08;
        } else if (law === "second") {
          secondVelocity += acceleration(force, mass) * deltaSeconds;
          secondPosition = advancePosition(
            secondPosition,
            secondVelocity * 0.012,
            deltaSeconds,
          );
          if (secondPosition > 1.08) {
            secondPosition = 0.1;
            secondVelocity = 0;
          }
        } else if (pushed) {
          bodyAPosition = advancePosition(
            bodyAPosition,
            interactionVelocity.first * 0.035,
            deltaSeconds,
          );
          bodyBPosition = advancePosition(
            bodyBPosition,
            interactionVelocity.second * 0.035,
            deltaSeconds,
          );
        }
      }

      drawScene(context, width, height, law, {
        bodyAPosition,
        bodyBPosition,
        firstMass,
        firstPosition,
        firstVelocity,
        force,
        interactionVelocity,
        mass,
        pushed,
        secondMass,
        secondPosition,
        secondVelocity,
      });

      if (time - lastTelemetryUpdate > 120) {
        lastTelemetryUpdate = time;
        if (law === "first") {
          setTelemetry({
            primary: `${firstVelocity.toFixed(2)} m/s`,
            secondary: "0 N net force",
          });
        } else if (law === "second") {
          setTelemetry({
            primary: `${acceleration(force, mass).toFixed(2)} m/s²`,
            secondary: `${secondVelocity.toFixed(2)} m/s velocity`,
          });
        } else {
          setTelemetry({
            primary: `A ${interactionVelocity.first.toFixed(2)} m/s`,
            secondary: `B +${interactionVelocity.second.toFixed(2)} m/s`,
          });
        }
      }

      animationFrame = requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [firstMass, force, law, mass, pushed, resetKey, secondMass, speed]);

  const chooseLaw = (nextLaw: Law) => {
    setLaw(nextLaw);
    setPaused(false);
    setPushed(false);
    setResetKey((value) => value + 1);
  };

  const reset = () => {
    setPushed(false);
    setResetKey((value) => value + 1);
  };

  return (
    <section className={styles.experiment} aria-labelledby="lab-title">
      <div className={styles.experimentHeader}>
        <div>
          <Typography
            as="p"
            variant="experimentKicker"
            className={styles.kicker}
          >
            Interactive laboratory
          </Typography>
          <Typography as="h2" variant="experimentForcesHeading" id="lab-title">
            Change one thing. Watch what follows.
          </Typography>
        </div>
        <Typography
          as="p"
          variant="experimentForcesStatus"
          className={styles.status}
        >
          {paused ? "Paused" : "Simulation live"}
        </Typography>
      </div>

      <div
        aria-label="Newton's laws"
        className={typographyVariants({
          variant: "experimentForcesTabs",
          className: styles.tabs,
        })}
        role="tablist"
      >
        {(Object.keys(LAW_LABELS) as Law[]).map((item, index) => (
          <button
            aria-selected={law === item}
            key={item}
            onClick={() => chooseLaw(item)}
            role="tab"
            type="button"
          >
            <span>0{index + 1}</span>
            {LAW_LABELS[item]}
          </button>
        ))}
      </div>

      <div className={styles.workspace}>
        <div className={styles.canvasFrame}>
          <canvas
            aria-label={`${LAW_LABELS[law]} force diagram and animation`}
            className={styles.canvas}
            ref={canvasRef}
            role="img"
          />
          <div
            aria-live="polite"
            className={typographyVariants({
              variant: "experimentForcesTelemetry",
              className: styles.telemetry,
            })}
          >
            <span>{telemetry.primary}</span>
            <span>{telemetry.secondary}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <div
            className={typographyVariants({
              variant: "experimentForcesControlCopy",
              className: styles.controlCopy,
            })}
          >
            <span>{LAW_LABELS[law]}</span>
            <h3>{lawTitle(law)}</h3>
            <p>{lawDescription(law)}</p>
          </div>

          {law === "first" ? (
            <RangeControl
              label="Initial velocity"
              max={4}
              min={0.5}
              onChange={(value) => setSpeed(value)}
              step={0.5}
              unit="m/s"
              value={speed}
            />
          ) : null}

          {law === "second" ? (
            <>
              <RangeControl
                label="Net force"
                max={24}
                min={2}
                onChange={setForce}
                step={2}
                unit="N"
                value={force}
              />
              <RangeControl
                label="Mass"
                max={12}
                min={2}
                onChange={setMass}
                step={1}
                unit="kg"
                value={mass}
              />
            </>
          ) : null}

          {law === "third" ? (
            <>
              <RangeControl
                label="Mass A"
                max={10}
                min={2}
                onChange={(value) => {
                  setFirstMass(value);
                  setPushed(false);
                }}
                step={1}
                unit="kg"
                value={firstMass}
              />
              <RangeControl
                label="Mass B"
                max={10}
                min={2}
                onChange={(value) => {
                  setSecondMass(value);
                  setPushed(false);
                }}
                step={1}
                unit="kg"
                value={secondMass}
              />
              <button
                className={typographyVariants({
                  variant: "experimentForcesPrimaryButton",
                  className: styles.primaryButton,
                })}
                disabled={pushed}
                onClick={() => setPushed(true)}
                type="button"
              >
                {pushed ? "Impulse applied" : "Push apart"}
              </button>
            </>
          ) : null}

          <div
            className={typographyVariants({
              variant: "experimentForcesActions",
              className: styles.actions,
            })}
          >
            <button onClick={() => setPaused((value) => !value)} type="button">
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={reset} type="button">
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function RangeControl({
  label,
  max,
  min,
  onChange,
  step,
  unit,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  unit: string;
  value: number;
}) {
  return (
    <label
      className={typographyVariants({
        variant: "experimentForcesRangeControl",
        className: styles.rangeControl,
      })}
    >
      <span>{label}</span>
      <output>
        {value} {unit}
      </output>
      <input
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function lawTitle(law: Law) {
  if (law === "first") return "Let it coast.";
  if (law === "second") return "Tune force and mass.";
  return "Separate the pair.";
}

function lawDescription(law: Law) {
  if (law === "first") {
    return "With no net force, the puck crosses the field without speeding up or slowing down.";
  }
  if (law === "second") {
    return "The same force produces less acceleration when it has more mass to move.";
  }
  return "The impulse is equal and opposite. The lighter body leaves with the greater speed.";
}

interface SceneState {
  bodyAPosition: number;
  bodyBPosition: number;
  firstMass: number;
  firstPosition: number;
  firstVelocity: number;
  force: number;
  interactionVelocity: { first: number; second: number };
  mass: number;
  pushed: boolean;
  secondMass: number;
  secondPosition: number;
  secondVelocity: number;
}

function drawScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  law: Law,
  state: SceneState,
) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#11151d";
  context.fillRect(0, 0, width, height);
  drawGrid(context, width, height);

  const trackY = height * 0.64;
  context.strokeStyle = "#3b4452";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, trackY + 34);
  context.lineTo(width, trackY + 34);
  context.stroke();

  if (law === "first") {
    const x = state.firstPosition * width;
    drawBody(context, x, trackY, 28, COLORS.blue, "m");
    drawArrow(
      context,
      x - 42,
      trackY - 58,
      x + 50,
      trackY - 58,
      COLORS.green,
      "v constant",
    );
    drawVectorBalance(context, width, "ΣF = 0 N", COLORS.muted);
  } else if (law === "second") {
    const x = state.secondPosition * width;
    const radius = 25 + state.mass * 1.4;
    drawBody(context, x, trackY, radius, COLORS.yellow, `${state.mass} kg`);
    drawArrow(
      context,
      x - radius - 56,
      trackY,
      x - radius - 4,
      trackY,
      COLORS.coral,
      `${state.force} N`,
    );
    drawVectorBalance(
      context,
      width,
      `a = ${(state.force / state.mass).toFixed(2)} m/s²`,
      COLORS.coral,
    );
  } else {
    const aX = state.bodyAPosition * width;
    const bX = state.bodyBPosition * width;
    drawBody(context, aX, trackY, 22 + state.firstMass, COLORS.blue, "A");
    drawBody(context, bX, trackY, 22 + state.secondMass, COLORS.yellow, "B");
    if (state.pushed) {
      drawArrow(
        context,
        aX,
        trackY - 68,
        aX - 76,
        trackY - 68,
        COLORS.blue,
        "−F",
      );
      drawArrow(
        context,
        bX,
        trackY - 68,
        bX + 76,
        trackY - 68,
        COLORS.yellow,
        "+F",
      );
    }
    drawVectorBalance(
      context,
      width,
      state.pushed ? "FA→B = −FB→A" : "Press “Push apart”",
      state.pushed ? COLORS.green : COLORS.muted,
    );
  }
}

function drawGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.strokeStyle = "#1e2632";
  context.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawBody(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  label: string,
) {
  context.save();
  context.shadowBlur = 28;
  context.shadowColor = color;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
  context.fillStyle = "#10141b";
  context.font = canvasTypography.forceLabel;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, x, y);
}

function drawArrow(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  label: string,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(
    toX - 11 * Math.cos(angle - Math.PI / 6),
    toY - 11 * Math.sin(angle - Math.PI / 6),
  );
  context.lineTo(
    toX - 11 * Math.cos(angle + Math.PI / 6),
    toY - 11 * Math.sin(angle + Math.PI / 6),
  );
  context.closePath();
  context.fill();
  context.font = canvasTypography.forceReadout;
  context.textAlign = "center";
  context.fillText(label, (fromX + toX) / 2, fromY - 14);
}

function drawVectorBalance(
  context: CanvasRenderingContext2D,
  width: number,
  label: string,
  color: string,
) {
  context.fillStyle = color;
  context.font = canvasTypography.forceEquation;
  context.textAlign = "left";
  context.fillText(label, Math.max(24, width * 0.06), 42);
}
