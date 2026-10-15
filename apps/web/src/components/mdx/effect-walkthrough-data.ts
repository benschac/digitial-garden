type StateCell = {
  label: string;
  value: string;
  tone?: "active" | "waiting" | "done";
};

export type Walkthrough = {
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
};

/** Prepared source walkthroughs, not an executing Effect runtime. */
export const effectWalkthroughs = {
  factory: {
    title: "Describe first. Run when admitted.",
    subtitle: "Effect.tryPromise → withPermit → task(context)",
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
        label: "Describe",
        line: 0,
        expression: "Effect.tryPromise",
        detail:
          "Constructing executeTask stores a recipe. The async factory has not been called, so no request has started.",
        cells: [
          { label: "Effect", value: "Described", tone: "active" },
          { label: "Permits", value: "Not acquired" },
          { label: "Task calls", value: "0" },
        ],
      },
      {
        label: "Run",
        line: 7,
        expression: "Effect.runPromise(program)",
        detail:
          "runPromise starts interpreting the composed program and returns a Promise. Execution still has to pass both permit checks.",
        cells: [
          { label: "Effect", value: "Running", tone: "active" },
          { label: "Permits", value: "Checking", tone: "waiting" },
          { label: "Task calls", value: "0" },
        ],
      },
      {
        label: "Wait",
        line: 4,
        expression: "item.withPermit",
        detail:
          "Suppose A1 already holds this item's permit. A2 waits here, before taking shared capacity. Its task-call count is still zero.",
        cells: [
          { label: "Effect", value: "Waiting", tone: "waiting" },
          { label: "Permits", value: "Item busy", tone: "waiting" },
          { label: "Task calls", value: "0" },
        ],
      },
      {
        label: "Invoke",
        line: 1,
        expression: "task(context)",
        detail:
          "After A1 settles, A2 acquires its item permit and an available shared permit. Only now does the factory invoke task(context).",
        cells: [
          { label: "Effect", value: "Executing", tone: "active" },
          { label: "Permits", value: "Both held", tone: "active" },
          { label: "Task calls", value: "1", tone: "done" },
        ],
      },
    ],
  },
  coalescing: {
    title: "One pending snapshot. The latest evidence.",
    subtitle: "Caller policy · use-progressive-identification.ts",
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
        label: "A2 arrives",
        line: 1,
        expression: "requestedItem",
        detail:
          "A1's identification cycle is running. New A2 evidence becomes the pending snapshot; it does not start another cycle yet.",
        cells: [
          { label: "Current cycle", value: "A1", tone: "active" },
          { label: "Pending evidence", value: "A2", tone: "waiting" },
          { label: "Next cycle", value: "Waiting" },
        ],
      },
      {
        label: "A3 replaces",
        line: 1,
        expression: "requestState.pendingItem",
        detail:
          "A3 arrives before A1 finishes. Assigning pendingItem again replaces A2. The caller retains one pending snapshot for this item.",
        cells: [
          { label: "Current cycle", value: "A1", tone: "active" },
          { label: "Pending evidence", value: "A3", tone: "waiting" },
          { label: "Next cycle", value: "Waiting" },
        ],
      },
      {
        label: "Join work",
        line: 4,
        expression: "Promise.allSettled",
        detail:
          "Even if the remote request has finished, this cycle waits for the classifier and local VLM to settle too. Free remote capacity alone does not advance it.",
        cells: [
          { label: "Current cycle", value: "Joining", tone: "waiting" },
          { label: "Pending evidence", value: "A3", tone: "waiting" },
          { label: "Next cycle", value: "Waiting" },
        ],
      },
      {
        label: "Use A3",
        line: 7,
        expression: "pendingItem",
        detail:
          "After all three branches settle, the loop consumes A3. A2 never gets a separate cycle. Any remote task from A3 still goes through queue admission.",
        cells: [
          { label: "Current cycle", value: "A3", tone: "active" },
          { label: "Pending evidence", value: "Empty", tone: "done" },
          { label: "Next cycle", value: "Started", tone: "done" },
        ],
      },
    ],
  },
  cancellation: {
    title: "An abort request is not a free slot.",
    subtitle: "One shared permit · A1 running, B1 waiting",
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
        label: "Start A1",
        line: 5,
        expression: 'removeEventListener("abort", abortWhileQueued)',
        detail:
          "A1 has acquired both permits. Removing the forwarding listener prevents a later caller abort from interrupting the queue's running Effect.",
        cells: [
          { label: "A1", value: "Running", tone: "active" },
          { label: "Shared slot", value: "Held by A1", tone: "active" },
          { label: "B1", value: "Waiting", tone: "waiting" },
        ],
      },
      {
        label: "Request abort",
        line: 7,
        expression: "await task(context)",
        detail:
          "The caller aborts. The request receives that signal, but A1's Promise is still pending in this example. Both permits stay held; B1 cannot start.",
        cells: [
          { label: "A1", value: "Abort requested", tone: "waiting" },
          { label: "Shared slot", value: "Still held", tone: "active" },
          { label: "B1", value: "Still waiting", tone: "waiting" },
        ],
      },
      {
        label: "Settle A1",
        line: 7,
        expression: "return await",
        detail:
          "A1's Promise eventually resolves or rejects. The task wrapper cleans up and exits; withPermit can now release the permits.",
        cells: [
          { label: "A1", value: "Settled", tone: "done" },
          { label: "Shared slot", value: "Released", tone: "done" },
          { label: "B1", value: "Eligible", tone: "waiting" },
        ],
      },
      {
        label: "Admit B1",
        line: 4,
        expression: "hasStarted = true",
        detail:
          "B1 acquires the released shared permit and enters its own factory. At no point did two unsettled tasks occupy this one-slot queue.",
        cells: [
          { label: "A1", value: "Settled", tone: "done" },
          { label: "Shared slot", value: "Held by B1", tone: "active" },
          { label: "B1", value: "Running", tone: "active" },
        ],
      },
    ],
  },
  cleanup: {
    title: "The await keeps the count honest.",
    subtitle: "Task settlement → application cleanup → permit release",
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
        label: "Pending",
        line: 2,
        expression: "await task(context)",
        detail:
          "The task's Promise is pending. await suspends this wrapper inside try, so finally has not run and activeCount still includes this task.",
        cells: [
          { label: "Task Promise", value: "Pending", tone: "active" },
          { label: "Active count", value: "1", tone: "active" },
          { label: "Permits", value: "Held", tone: "active" },
        ],
      },
      {
        label: "Clean up",
        line: 4,
        expression: "this.activeCount -= 1",
        detail:
          "When the task resolves or rejects, finally decrements the active count and removes the active item. Both success and failure take this path.",
        cells: [
          { label: "Task Promise", value: "Settled", tone: "done" },
          { label: "Active count", value: "0", tone: "done" },
          { label: "Permits", value: "Exiting wrapper", tone: "waiting" },
        ],
      },
      {
        label: "Release",
        line: 6,
        expression: "}",
        detail:
          "The wrapper exits and Effect releases the nested permits. The returned Promise's separate finally removes the pending entry, listener, and semaphore reference.",
        cells: [
          { label: "Task Promise", value: "Settled", tone: "done" },
          { label: "Active count", value: "0", tone: "done" },
          { label: "Permits", value: "Released", tone: "done" },
        ],
      },
    ],
  },
} satisfies Record<string, Walkthrough>;

export type EffectWalkthroughKind = keyof typeof effectWalkthroughs;
