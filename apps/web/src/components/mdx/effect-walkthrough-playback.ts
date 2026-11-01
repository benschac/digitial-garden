import { createMachine, types } from "xstate";

export const effectWalkthroughPlayback = createMachine({
  context: ({ input }) => ({
    generation: 0,
    reducedMotion: true,
    step: 0,
    stepCount: input.stepCount,
  }),
  id: "effect-walkthrough-playback",
  initial: "paused",
  on: {
    MOTION: ({ context, event }) => {
      const update = {
        generation: context.generation + 1,
        reducedMotion: event.reduced,
      };

      if (event.reduced) {
        return { context: update, target: ".paused" };
      }

      return { context: update };
    },
    PAUSE: ({ context }) => ({
      context: { generation: context.generation + 1 },
      target: ".paused",
    }),
    SELECT: ({ context, event }) => {
      if (
        !Number.isInteger(event.step) ||
        event.step < 0 ||
        event.step >= context.stepCount
      ) {
        return;
      }

      return {
        context: { generation: context.generation + 1, step: event.step },
        target: ".paused",
      };
    },
  },
  schemas: {
    events: {
      INTERVAL: types<{ generation: number }>(),
      MOTION: types<{ reduced: boolean }>(),
      PAUSE: types<{ type: "PAUSE" }>(),
      PLAY: types<{ type: "PLAY" }>(),
      SELECT: types<{ step: number }>(),
    },
    input: types<{ stepCount: number }>(),
  },
  states: {
    completed: {
      on: {
        PLAY: ({ context }) => {
          if (context.reducedMotion) {
            return;
          }

          return {
            context: { generation: context.generation + 1, step: 0 },
            target: "playing",
          };
        },
      },
    },
    paused: {
      on: {
        PLAY: ({ context }) => {
          if (context.reducedMotion) {
            return;
          }

          return {
            context: {
              generation: context.generation + 1,
              step: context.step === context.stepCount - 1 ? 0 : context.step,
            },
            target: "playing",
          };
        },
      },
    },
    playing: {
      on: {
        INTERVAL: ({ context, event }) => {
          if (event.generation !== context.generation) {
            return;
          }

          if (context.step === context.stepCount - 1) {
            return { target: "completed" };
          }

          return { context: { step: context.step + 1 } };
        },
      },
    },
  },
});
