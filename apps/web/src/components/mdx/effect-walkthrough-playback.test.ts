import { expect, test } from "bun:test";

import { initialTransition, transition } from "xstate";
import type { EventFrom, SnapshotFrom } from "xstate";

import { effectWalkthroughPlayback } from "./effect-walkthrough-playback";

const initial = (stepCount = 3) =>
  initialTransition(effectWalkthroughPlayback, { stepCount })[0];

const send = (
  snapshot: SnapshotFrom<typeof effectWalkthroughPlayback>,
  event: EventFrom<typeof effectWalkthroughPlayback>
) => transition(effectWalkthroughPlayback, snapshot, event)[0];

const interval = (snapshot: SnapshotFrom<typeof effectWalkthroughPlayback>) =>
  send(snapshot, {
    generation: snapshot.context.generation,
    type: "INTERVAL",
  });

test("starts paused and completes only after the final step's interval", () => {
  const paused = initial();
  expect(paused.matches("paused")).toBe(true);
  expect(paused.context.step).toBe(0);

  const ready = send(paused, { reduced: false, type: "MOTION" });
  const playing = send(ready, { type: "PLAY" });
  const second = interval(playing);
  const last = interval(second);
  expect(last.matches("playing")).toBe(true);
  expect(last.context.step).toBe(2);

  const completed = interval(last);
  expect(completed.matches("completed")).toBe(true);
  expect(completed.context.step).toBe(2);

  const replay = send(completed, { type: "PLAY" });
  expect(replay.matches("playing")).toBe(true);
  expect(replay.context.step).toBe(0);
});

test("manual selection pauses playback and replay from the last step restarts", () => {
  let snapshot = send(initial(), { reduced: false, type: "MOTION" });
  snapshot = send(snapshot, { type: "PLAY" });
  snapshot = send(snapshot, { step: 2, type: "SELECT" });
  expect(snapshot.matches("paused")).toBe(true);
  expect(snapshot.context.step).toBe(2);
  expect(send(snapshot, { step: 3, type: "SELECT" })).toBe(snapshot);

  snapshot = send(snapshot, { type: "PLAY" });
  expect(snapshot.context.step).toBe(0);
  expect(snapshot.matches("playing")).toBe(true);
});

test("pauses retain the step and reject stale intervals after resuming", () => {
  let snapshot = send(initial(), { reduced: false, type: "MOTION" });
  snapshot = interval(send(snapshot, { type: "PLAY" }));
  const oldGeneration = snapshot.context.generation;
  snapshot = send(snapshot, { type: "PAUSE" });
  expect(interval(snapshot)).toBe(snapshot);
  expect(snapshot.context.step).toBe(1);

  snapshot = send(snapshot, { type: "PLAY" });
  expect(send(snapshot, { generation: oldGeneration, type: "INTERVAL" })).toBe(
    snapshot
  );
  expect(interval(snapshot).context.step).toBe(2);
});

test("reduced motion prevents playback while preserving manual navigation", () => {
  let snapshot = initial();
  expect(send(snapshot, { type: "PLAY" })).toBe(snapshot);
  snapshot = send(snapshot, { step: 1, type: "SELECT" });
  expect(snapshot.context.step).toBe(1);

  snapshot = send(snapshot, { reduced: false, type: "MOTION" });
  snapshot = send(snapshot, { type: "PLAY" });
  snapshot = send(snapshot, { reduced: true, type: "MOTION" });
  expect(snapshot.matches("paused")).toBe(true);
  expect(snapshot.context.step).toBe(1);
  expect(send(snapshot, { type: "PLAY" })).toBe(snapshot);
});
