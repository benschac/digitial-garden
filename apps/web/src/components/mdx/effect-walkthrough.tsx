"use client";

import {
  useAbortController,
  useAnimationFrame,
  useDocumentEvent,
  useIntersectionObserver,
  useMediaQuery,
} from "@personal-site/react-hooks";
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ThemedToken } from "shiki";
import { createActor, initialTransition } from "xstate";
import type { ActorRefFrom } from "xstate";

import { getArticleCodeTokenizer } from "./article-code-theme";
import type { ArticleCodeTokens } from "./article-code-theme";
import { effectWalkthroughs } from "./effect-walkthrough-data";
import type { EffectWalkthroughKind } from "./effect-walkthrough-data";
import { effectWalkthroughPlayback } from "./effect-walkthrough-playback";

import styles from "./effect-walkthrough.module.css";

const ColoredCode = ({
  line,
  tokens,
  start = 0,
  end = line.length,
}: {
  line: string;
  tokens?: ThemedToken[];
  start?: number;
  end?: number;
}) => {
  if (!tokens) {
    return line.slice(start, end);
  }

  let offset = 0;

  return tokens.map((token) => {
    const from = offset;
    offset += token.content.length;

    if (offset <= start || from >= end) {
      return null;
    }

    return (
      <span key={from} style={{ color: token.color }}>
        {token.content.slice(Math.max(0, start - from), end - from)}
      </span>
    );
  });
};

const EffectWalkthroughPlayer = ({ kind }: { kind: EffectWalkthroughKind }) => {
  const walkthrough = effectWalkthroughs[kind];
  const source = walkthrough.code.join("\n");

  const [highlighted, setHighlighted] = useState<{
    source: string;
    tokens: ArticleCodeTokens;
  } | null>(null);

  const createController = useAbortController();
  // The source can change with kind; cancel late async initialization on restart.
  useEffect(() => {
    const controller = createController();

    const initializeHighlighting = async () => {
      try {
        const tokenize = await getArticleCodeTokenizer();

        if (!controller.signal.aborted) {
          setHighlighted({ source, tokens: tokenize(source) });
        }
      } catch {
        // Plain source and expression highlighting remain usable without Shiki.
      }
    };

    void initializeHighlighting();

    return () => controller.abort();
  }, [source, createController]);
  const stepCount = walkthrough.steps.length;

  const [snapshot, setSnapshot] = useState(
    () => initialTransition(effectWalkthroughPlayback, { stepCount })[0]
  );

  const actorRef = useRef<ActorRefFrom<
    typeof effectWalkthroughPlayback
  > | null>(null);

  const [instant, setInstant] = useState(false);
  const host = useRef<HTMLElement>(null);

  const startedAt = useRef<{ timestamp: number; generation: number } | null>(
    null
  );

  const titleId = useId();
  const { step, reducedMotion } = snapshot.context;
  const playing = snapshot.matches("playing");
  const current = walkthrough.steps[step];
  const last = step === stepCount - 1;
  const playLabel = last ? "Replay" : "Play";

  const { requestFrame, cancelFrame } = useAnimationFrame((timestamp) => {
    const actor = actorRef.current;
    const active = actor?.getSnapshot();

    if (!actor || !active?.matches("playing")) {
      return false;
    }

    const { generation } = active.context;

    if (startedAt.current?.generation !== generation) {
      startedAt.current = { generation, timestamp };
    }

    if (timestamp - startedAt.current.timestamp >= 4200) {
      startedAt.current = { generation, timestamp };
      actor.send({ generation, type: "INTERVAL" });
    }

    return actor.getSnapshot().matches("playing");
  });

  useEffect(() => {
    const actor = createActor(effectWalkthroughPlayback, {
      input: { stepCount },
    });

    const subscription = actor.subscribe(setSnapshot);
    actorRef.current = actor;
    actor.start();

    return () => {
      actorRef.current = null;
      cancelFrame();
      startedAt.current = null;
      subscription.unsubscribe();
      actor.stop();
    };
  }, [stepCount, cancelFrame]);

  const pause = () => {
    cancelFrame();
    actorRef.current?.send({ type: "PAUSE" });
    startedAt.current = null;
  };

  useMediaQuery("(prefers-reduced-motion: reduce)", (matches) => {
    actorRef.current?.send({ reduced: matches, type: "MOTION" });

    if (matches) {
      cancelFrame();
      startedAt.current = null;
    }
  });
  useIntersectionObserver(host, (visible) => {
    if (!visible) {
      pause();
    }
  });
  useDocumentEvent("visibilitychange", () => {
    if (document.hidden) {
      pause();
    }
  });

  const selectStep = (index: number, fromKeyboard: boolean) => {
    pause();
    setInstant(fromKeyboard);
    actorRef.current?.send({ step: index, type: "SELECT" });
  };

  return (
    <figure
      ref={host}
      className={styles.figure}
      aria-labelledby={titleId}
      data-prose-exclude
      data-mdx-interactive
      data-effect-walkthrough={kind}
      data-instant={instant || reducedMotion}
    >
      <header className={styles.header}>
        <span className={styles.eyebrow}>Follow the code</span>
        <h3 className={styles.title} id={titleId}>
          {walkthrough.title}
        </h3>
        <p className={styles.subtitle}>{walkthrough.subtitle}</p>
      </header>

      <div className={styles.states}>
        {current.cells.map((cell) => (
          <div className={styles.cell} key={cell.label} data-tone={cell.tone}>
            <span className={styles.cellLabel}>{cell.label}</span>
            <strong className={styles.cellValue} key={cell.value}>
              <span className={styles.dot} aria-hidden="true" />
              {cell.value}
            </strong>
          </div>
        ))}
      </div>

      <div className={styles.codeArea}>
        <div className={styles.codeHeading}>
          <span>TypeScript · shortened source</span>
          <span>Highlighted expression ↓</span>
        </div>
        {/* Keyboard focus lets readers scroll long source lines on narrow screens. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The source region scrolls horizontally. */}
        <pre className={styles.code} tabIndex={0}>
          <code>
            {walkthrough.code.map((line, index) => {
              const active = index === current.line;
              const start = active ? line.indexOf(current.expression) : -1;

              const tokens =
                highlighted?.source === source
                  ? highlighted.tokens[index]
                  : undefined;

              return (
                <span className={styles.line} key={line} data-active={active}>
                  <span className={styles.lineNumber} aria-hidden="true">
                    {active ? "→" : String(index + 1).padStart(2, "0")}
                  </span>
                  {start === -1 ? (
                    <ColoredCode line={line} tokens={tokens} />
                  ) : (
                    <>
                      <ColoredCode line={line} tokens={tokens} end={start} />
                      <mark className={styles.expression}>
                        <ColoredCode
                          line={line}
                          tokens={tokens}
                          start={start}
                          end={start + current.expression.length}
                        />
                      </mark>
                      <ColoredCode
                        line={line}
                        tokens={tokens}
                        start={start + current.expression.length}
                      />
                    </>
                  )}
                  {"\n"}
                </span>
              );
            })}
          </code>
        </pre>
      </div>

      <nav className={styles.steps} aria-label="Walkthrough steps">
        {walkthrough.steps.map((item, index) => (
          <button
            type="button"
            key={item.label}
            className={styles.step}
            aria-pressed={step === index}
            onClick={(event) => selectStep(index, event.detail === 0)}
          >
            <span className={styles.stepNumber}>{index + 1}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <figcaption className={styles.caption}>
        <p className={styles.detail} aria-live={playing ? "off" : "polite"}>
          {current.detail}
        </p>
        <div className={styles.footer}>
          <span className={styles.note}>
            Illustrated sequence · no requests run
          </span>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.control}
              aria-label="Previous code step"
              disabled={step === 0}
              onClick={(event) => selectStep(step - 1, event.detail === 0)}
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
            {!reducedMotion && (
              <button
                type="button"
                className={styles.control}
                onClick={(event) => {
                  if (playing) {
                    pause();
                  } else {
                    setInstant(event.detail === 0);

                    actorRef.current?.send({ type: "PLAY" });

                    if (actorRef.current?.getSnapshot().matches("playing")) {
                      requestFrame();
                    }
                  }
                }}
              >
                {playing ? <Pause size={14} aria-hidden="true" /> : null}
                {!playing && last ? (
                  <RotateCcw size={14} aria-hidden="true" />
                ) : null}
                {!playing && !last ? (
                  <Play size={14} aria-hidden="true" />
                ) : null}
                {playing ? "Pause" : playLabel}
              </button>
            )}
            <button
              type="button"
              className={styles.control}
              aria-label="Next code step"
              disabled={last}
              onClick={(event) => selectStep(step + 1, event.detail === 0)}
            >
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </figcaption>
    </figure>
  );
};

export const EffectWalkthrough = ({
  kind,
}: {
  kind: EffectWalkthroughKind;
}) => <EffectWalkthroughPlayer key={kind} kind={kind} />;
