interface StateCell {
  label: string;
  value: string;
  tone?: "active" | "waiting" | "done";
}

export interface Walkthrough {
  title: string;
  subtitle: string;
  code: string[];
  steps: {
    label: string;
    line: number;
    expression: string;
    detail: string;
    cells: StateCell[];
  }[];
}

/** Prepared source walkthroughs, not an executing Effect runtime. */
export const effectWalkthroughs = {
  cancellation: {
    code: [
      "const abortWhileQueued = () => {",
      "  if (!hasStarted) queueAbortController.abort(signal?.reason);",
      "};",
      "// Once admitted, inside the task factory:",
      "hasStarted = true;",
      'signal?.removeEventListener("abort", abortWhileQueued);',
      "// The task still receives the caller's signal.",
      "return await task(context);",
    ],
    steps: [
      {
        cells: [
          { label: "A1", tone: "active", value: "Running" },
          { label: "Shared slot", tone: "active", value: "Held by A1" },
          { label: "B1", tone: "waiting", value: "Waiting" },
        ],
        detail:
          "A1 has acquired both permits. Removing the forwarding listener prevents a later caller abort from interrupting the queue's running Effect.",
        expression: 'removeEventListener("abort", abortWhileQueued)',
        label: "Start A1",
        line: 5,
      },
      {
        cells: [
          { label: "A1", tone: "waiting", value: "Abort requested" },
          { label: "Shared slot", tone: "active", value: "Still held" },
          { label: "B1", tone: "waiting", value: "Still waiting" },
        ],
        detail:
          "The caller aborts. The request receives that signal, but A1's Promise is still pending in this example. Both permits stay held; B1 cannot start.",
        expression: "await task(context)",
        label: "Request abort",
        line: 7,
      },
      {
        cells: [
          { label: "A1", tone: "done", value: "Settled" },
          { label: "Shared slot", tone: "done", value: "Released" },
          { label: "B1", tone: "waiting", value: "Eligible" },
        ],
        detail:
          "A1's Promise eventually resolves or rejects. The task wrapper cleans up and exits; withPermit can now release the permits.",
        expression: "return await",
        label: "Settle A1",
        line: 7,
      },
      {
        cells: [
          { label: "A1", tone: "done", value: "Settled" },
          { label: "Shared slot", tone: "active", value: "Held by B1" },
          { label: "B1", tone: "active", value: "Running" },
        ],
        detail:
          "B1 acquires the released shared permit and enters its own factory. At no point did two unsettled tasks occupy this one-slot queue.",
        expression: "hasStarted = true",
        label: "Admit B1",
        line: 4,
      },
    ],
    subtitle: "One shared permit · A1 running, B1 waiting",
    title: "An abort request is not a free slot.",
  },
  cleanup: {
    code: [
      "try {",
      "  options.onStarted?.(context);",
      "  return await task(context);",
      "} finally {",
      "  this.activeCount -= 1;",
      "  this.activeItemIntentIds.delete(itemIntentId);",
      "}",
    ],
    steps: [
      {
        cells: [
          { label: "Task Promise", tone: "active", value: "Pending" },
          { label: "Active count", tone: "active", value: "1" },
          { label: "Permits", tone: "active", value: "Held" },
        ],
        detail:
          "The task's Promise is pending. await suspends this wrapper inside try, so finally has not run and activeCount still includes this task.",
        expression: "await task(context)",
        label: "Pending",
        line: 2,
      },
      {
        cells: [
          { label: "Task Promise", tone: "done", value: "Settled" },
          { label: "Active count", tone: "done", value: "0" },
          { label: "Permits", tone: "waiting", value: "Exiting wrapper" },
        ],
        detail:
          "When the task resolves or rejects, finally decrements the active count and removes the active item. Both success and failure take this path.",
        expression: "this.activeCount -= 1",
        label: "Clean up",
        line: 4,
      },
      {
        cells: [
          { label: "Task Promise", tone: "done", value: "Settled" },
          { label: "Active count", tone: "done", value: "0" },
          { label: "Permits", tone: "done", value: "Released" },
        ],
        detail:
          "The wrapper exits and Effect releases the nested permits. The returned Promise's separate finally removes the pending entry, listener, and semaphore reference.",
        expression: "}",
        label: "Release",
        line: 6,
      },
    ],
    subtitle: "Task settlement → application cleanup → permit release",
    title: "The await keeps the count honest.",
  },
  coalescing: {
    code: [
      "requestState.desiredCaptureKey = nextCaptureKey;",
      "requestState.pendingItem = requestedItem;",
      "if (requestState.inFlight) return;",
      "// Inside the current cycle:",
      "await Promise.allSettled([",
      "  classifierPromise, remotePromise, localVlmPromise,",
      "]);",
      "// The next iteration consumes pendingItem.",
    ],
    steps: [
      {
        cells: [
          { label: "Current cycle", tone: "active", value: "A1" },
          { label: "Pending evidence", tone: "waiting", value: "A2" },
          { label: "Next cycle", value: "Waiting" },
        ],
        detail:
          "A1's identification cycle is running. New A2 evidence becomes the pending snapshot; it does not start another cycle yet.",
        expression: "requestedItem",
        label: "A2 arrives",
        line: 1,
      },
      {
        cells: [
          { label: "Current cycle", tone: "active", value: "A1" },
          { label: "Pending evidence", tone: "waiting", value: "A3" },
          { label: "Next cycle", value: "Waiting" },
        ],
        detail:
          "A3 arrives before A1 finishes. Assigning pendingItem again replaces A2. The caller retains one pending snapshot for this item.",
        expression: "requestState.pendingItem",
        label: "A3 replaces",
        line: 1,
      },
      {
        cells: [
          { label: "Current cycle", tone: "waiting", value: "Joining" },
          { label: "Pending evidence", tone: "waiting", value: "A3" },
          { label: "Next cycle", value: "Waiting" },
        ],
        detail:
          "Even if the remote request has finished, this cycle waits for the classifier and local VLM to settle too. Free remote capacity alone does not advance it.",
        expression: "Promise.allSettled",
        label: "Join work",
        line: 4,
      },
      {
        cells: [
          { label: "Current cycle", tone: "active", value: "A3" },
          { label: "Pending evidence", tone: "done", value: "Empty" },
          { label: "Next cycle", tone: "done", value: "Started" },
        ],
        detail:
          "After all three branches settle, the loop consumes A3. A2 never gets a separate cycle. Any remote task from A3 still goes through queue admission.",
        expression: "pendingItem",
        label: "Use A3",
        line: 7,
      },
    ],
    subtitle: "Caller policy · use-progressive-identification.ts",
    title: "One pending snapshot. The latest evidence.",
  },
  factory: {
    code: [
      "const executeTask = Effect.tryPromise({",
      "  try: async () => task(context),",
      "  catch: (error) => error,",
      "});",
      "const program = item.withPermit(",
      "  global.withPermit(executeTask),",
      ");",
      "Effect.runPromise(program);",
    ],
    steps: [
      {
        cells: [
          { label: "Effect", tone: "active", value: "Described" },
          { label: "Permits", value: "Not acquired" },
          { label: "Task calls", value: "0" },
        ],
        detail:
          "Constructing executeTask stores a recipe. The async factory has not been called, so no request has started.",
        expression: "Effect.tryPromise",
        label: "Describe",
        line: 0,
      },
      {
        cells: [
          { label: "Effect", tone: "active", value: "Running" },
          { label: "Permits", tone: "waiting", value: "Checking" },
          { label: "Task calls", value: "0" },
        ],
        detail:
          "runPromise starts interpreting the composed program and returns a Promise. Execution still has to pass both permit checks.",
        expression: "Effect.runPromise(program)",
        label: "Run",
        line: 7,
      },
      {
        cells: [
          { label: "Effect", tone: "waiting", value: "Waiting" },
          { label: "Permits", tone: "waiting", value: "Item busy" },
          { label: "Task calls", value: "0" },
        ],
        detail:
          "Suppose A1 already holds this item's permit. A2 waits here, before taking shared capacity. Its task-call count is still zero.",
        expression: "item.withPermit",
        label: "Wait",
        line: 4,
      },
      {
        cells: [
          { label: "Effect", tone: "active", value: "Executing" },
          { label: "Permits", tone: "active", value: "Both held" },
          { label: "Task calls", tone: "done", value: "1" },
        ],
        detail:
          "After A1 settles, A2 acquires its item permit and an available shared permit. Only now does the factory invoke task(context).",
        expression: "task(context)",
        label: "Invoke",
        line: 1,
      },
    ],
    subtitle: "Effect.tryPromise → withPermit → task(context)",
    title: "Describe first. Run when admitted.",
  },
} satisfies Record<string, Walkthrough>;

export type EffectWalkthroughKind = keyof typeof effectWalkthroughs;
