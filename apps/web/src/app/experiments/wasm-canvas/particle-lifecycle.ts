import {
  createEffectActor,
  createEffectLogic,
  setupEffect,
  waitFor,
} from "@xstate/effect";
import { Effect, Exit, Scope } from "effect";

import { initializeParticleRenderer } from "./particle-initialization";
import type { ParticleFrame, ParticleRenderer } from "./particle-renderer";

export type ParticleAvailability =
  | "initializing"
  | "fallback"
  | "ready"
  | "lost"
  | "failed"
  | "disposed";

interface Eligibility {
  paused: boolean;
  hidden: boolean;
  visible: boolean;
  reducedMotion: boolean;
}

type LifecycleEvent =
  | { type: "FALLBACK" }
  | { type: "LOST" }
  | { type: "DISPOSE" };

interface Options {
  signal: AbortSignal;
  createGpu: (
    signal: AbortSignal,
    lost: (message: string) => void
  ) => Promise<ParticleRenderer | null>;
  createFallback: (signal: AbortSignal) => Promise<ParticleRenderer>;
  configure: (renderer: ParticleRenderer, signal: AbortSignal) => void;
  onGpuFailure: Parameters<
    typeof initializeParticleRenderer
  >[0]["onGpuFailure"];
  onState: (state: ParticleAvailability, detail?: Error | string) => void;
  onAnimationChange: (canAnimate: boolean) => void;
  eligibility?: Partial<Eligibility>;
}

export const createParticleLifecycle = (options: Options) => {
  const scope = Effect.runSync(Scope.make());
  const cancellation = new AbortController();

  if (options.signal.aborted) {
    cancellation.abort();
  }

  let renderer: ParticleRenderer | null = null;
  let availability: ParticleAvailability = "initializing";
  let failure: Error | undefined;
  let lostMessage: string | undefined;
  let closing: Promise<void> | undefined;

  let eligibility: Eligibility = {
    hidden: false,
    paused: false,
    reducedMotion: false,
    visible: true,
    ...options.eligibility,
  };

  const pending: LifecycleEvent[] = [];

  let dispatch = (event: LifecycleEvent) => {
    pending.push(event);
  };

  const canAnimate = () =>
    availability === "ready" &&
    !cancellation.signal.aborted &&
    !eligibility.paused &&
    !eligibility.hidden &&
    eligibility.visible &&
    !eligibility.reducedMotion;

  const release = () => {
    const owned = renderer;
    renderer = null;
    owned?.destroy();
  };

  Effect.runSync(Scope.addFinalizer(scope, Effect.sync(release)));

  const lost = (message: string) => {
    if (cancellation.signal.aborted) {
      return;
    }

    lostMessage = message;
    cancellation.abort();
    release();
    options.onAnimationChange(false);
    dispatch({ type: "LOST" });
  };

  const initialize = createEffectLogic(
    Effect.tryPromise({
      catch: (error) =>
        error instanceof Error
          ? error
          : new Error("Particle initialization failed.", { cause: error }),
      try: async () => {
        const acquired = await initializeParticleRenderer({
          configure: (candidate) =>
            options.configure(candidate, cancellation.signal),
          createFallback: options.createFallback,
          createGpu: (signal) => options.createGpu(signal, lost),
          onFallback: () => dispatch({ type: "FALLBACK" }),
          onGpuFailure: options.onGpuFailure,
          signal: cancellation.signal,
        });

        if (cancellation.signal.aborted) {
          acquired.destroy();
          cancellation.signal.throwIfAborted();
        }

        renderer = acquired;
      },
    }).pipe(
      Effect.catchIf(
        () => cancellation.signal.aborted,
        () => Effect.void
      ),
      Effect.tapError((cause) =>
        Effect.sync(() => {
          failure = cause;
        })
      )
    )
  );

  const machine = setupEffect({ actors: { initialize } }).createMachine({
    initial: "initializing",
    on: { DISPOSE: { target: ".disposed" } },
    states: {
      disposed: { type: "final" },
      failed: {},
      initializing: {
        initial: "gpu",
        invoke: {
          onDone: { target: "ready" },
          onError: { target: "failed" },
          src: "initialize",
        },
        on: { LOST: { target: "lost" } },
        states: {
          fallback: {},
          gpu: { on: { FALLBACK: { target: "fallback" } } },
        },
      },
      lost: {},
      ready: { on: { LOST: { target: "lost" } } },
    },
  });

  const start = async () => {
    const actor = await Effect.runPromise(
      createEffectActor(machine).pipe(Scope.provide(scope))
    );

    const observe = () => {
      const snapshot = actor.getSnapshot();

      const terminalStates = ["disposed", "lost", "failed", "ready"] as const;

      const initializing = snapshot.matches({ initializing: "fallback" })
        ? "fallback"
        : "initializing";

      const next =
        terminalStates.find((state) => snapshot.matches(state)) ?? initializing;

      if (closing && next !== "disposed") {
        return;
      }

      if (
        cancellation.signal.aborted &&
        next !== "lost" &&
        next !== "disposed"
      ) {
        return;
      }

      if (next === availability) {
        return;
      }

      availability = next;
      let detail: Error | string | undefined;

      if (next === "lost") {
        detail = lostMessage;
      }

      if (next === "failed") {
        detail = failure;
      }

      options.onState(next, detail);

      if (next !== "disposed") {
        options.onAnimationChange(canAnimate());
      }
    };

    actor.subscribe(observe);
    dispatch = (event) => actor.send(event);

    for (const event of pending) {
      dispatch(event);
    }

    pending.length = 0;
    observe();

    return actor;
  };

  const started = start();

  const stop = async () => {
    const actor = await started;

    try {
      actor.send({ type: "DISPOSE" });
      await Effect.runPromise(
        waitFor(actor, (snapshot) => snapshot.matches("disposed"))
      );
    } finally {
      await Effect.runPromise(Scope.close(scope, Exit.void));
    }
  };

  const dispose = () => {
    if (closing) {
      return closing;
    }

    cancellation.abort();
    release();
    options.onAnimationChange(false);
    options.signal.removeEventListener("abort", dispose);
    closing = stop();

    return closing;
  };

  options.signal.addEventListener("abort", dispose, { once: true });

  if (options.signal.aborted) {
    void dispose();
  }

  return {
    get availability() {
      return availability;
    },
    canAnimate,
    dispose,
    render(frame: ParticleFrame) {
      if (availability === "ready" && !cancellation.signal.aborted) {
        renderer?.render(frame);
      }
    },
    resize(width: number, height: number, pixelRatio: number) {
      if (availability === "ready" && !cancellation.signal.aborted) {
        renderer?.resize(width, height, pixelRatio);
      }
    },
    setEligibility(next: Partial<Eligibility>) {
      eligibility = { ...eligibility, ...next };
      options.onAnimationChange(canAnimate());
    },
    setParticleCount(count: number) {
      return availability === "ready" && !cancellation.signal.aborted
        ? (renderer?.setParticleCount(count) ?? count)
        : count;
    },
  };
};

export type ParticleLifecycle = ReturnType<typeof createParticleLifecycle>;
