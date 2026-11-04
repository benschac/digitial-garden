import { afterEach, expect, test } from "bun:test";
import { setImmediate } from "node:timers/promises";

import { Effect, Exit } from "effect";
import { FetchHttpClient } from "effect/http";

import {
  loadDiagramDocument,
  createAnimatedDiagramMount,
} from "./animated-diagram-lifecycle";

const pendingDisposals = new Set<() => void>();

afterEach(() => {
  for (const dispose of pendingDisposals) {
    dispose();
  }

  pendingDisposals.clear();
});

const flush = async () => {
  await setImmediate();
  await setImmediate();
};

const createFixture = ({
  code = true,
  failDocument = false,
  failObserver = false,
} = {}) => {
  const controller = new AbortController();
  const events: string[] = [];
  const statuses: string[] = [];
  const players: Player[] = [];
  const buttons = [{ attributes: new Map<string, string>(), title: "Play" }];
  const doc = { elements: code ? [{ type: "code" }] : [] };

  type Document = typeof doc;

  let labelControls: (() => void) | undefined;

  const root = {
    querySelector: () => ({}),
    querySelectorAll: (selector: string) =>
      selector === "button[title]"
        ? buttons.map((button) => ({
            ...button,
            setAttribute: (key: string, value: string) => {
              button.attributes.set(key, value);
            },
          }))
        : buttons.map((button) => ({
            ...button,
            setAttribute: (key: string, value: string) => {
              button.attributes.set(key, value);
            },
          })),
  };

  class Player {
    document: Document = { elements: [] };
    className = "";
    figStyle = {};
    removed = false;
    attributes = new Map<string, string>();
    shadowRoot = root;

    constructor() {
      players.push(this);
    }

    setAttribute(key: string, value: string) {
      this.attributes.set(key, value);
    }

    get doc() {
      return this.document;
    }

    set doc(value: Document) {
      if (failDocument) {
        throw new Error("Invalid Giotto document");
      }

      this.document = value;
    }

    remove = () => {
      this.removed = true;
      events.push("remove player");
    };
  }

  const highlighting = {
    getArticleCodeTokenizer: async () => await Promise.try(() => () => []),
    highlightDiagramCode: () => {
      events.push("start highlighting");

      return () => {
        events.push("stop highlighting");
      };
    },
  };

  const dependencies = {
    createControlsObserver: (listener: () => void) => {
      labelControls = listener;

      return {
        disconnect: () => {
          events.push("disconnect controls");
        },
        observe: () => {
          events.push("observe controls");

          if (failObserver) {
            throw new Error("Observer setup failed");
          }
        },
      };
    },
    loadDocument: () => Effect.succeed(doc),
    loadHighlighting: async () => await Promise.try(() => highlighting),
    loadPlayer: async () => await Promise.try(() => ({ GiottoPlayer: Player })),
  };

  const options = {
    autoplay: true,
    captionId: "diagram-caption",
    container: {
      append: () => {
        events.push("append player");
      },
    },
    onStatus: (status: string) => {
      statuses.push(status);
    },
    playerClassName: "article-player",
    signal: controller.signal,
    src: "/diagrams/example.json",
    theme: "dark" as const,
  };

  return {
    buttons,
    controller,
    dependencies,
    doc,
    events,
    highlighting,
    labelControls: () => labelControls?.(),
    options,
    players,
    start() {
      const dispose = createAnimatedDiagramMount(dependencies)(options);
      pendingDisposals.add(dispose);

      return dispose;
    },
    statuses,
  };
};

test("keeps player and observers alive after setup, then disposes each exactly once", async () => {
  const fixture = createFixture();
  const dispose = fixture.start();
  await flush();

  expect(fixture.statuses.at(-1)).toBe("");
  expect(fixture.events.toSorted((a, b) => a.localeCompare(b))).toEqual(
    ["append player", "observe controls", "start highlighting"].toSorted(
      (a, b) => a.localeCompare(b)
    )
  );
  expect(fixture.players[0].document).toEqual(fixture.doc);
  expect(fixture.players[0].attributes.get("aria-describedby")).toBe(
    fixture.options.captionId
  );
  expect(fixture.buttons[0].attributes.get("aria-label")).toBe("Play");

  const setupEventCount = fixture.events.length;
  dispose();
  dispose();
  await flush();

  expect(
    fixture.events.slice(setupEventCount).toSorted((a, b) => a.localeCompare(b))
  ).toEqual(
    ["stop highlighting", "disconnect controls", "remove player"].toSorted(
      (a, b) => a.localeCompare(b)
    )
  );
  fixture.buttons[0].attributes.clear();
  fixture.labelControls();
  expect(fixture.buttons[0].attributes.size).toBe(0);
});

for (const phase of [
  "player import",
  "document",
  "highlight import",
  "tokenizer",
]) {
  test(`cancellation during ${phase} blocks late DOM and status publication`, async () => {
    const fixture = createFixture();
    const pending = Promise.withResolvers<undefined>();

    if (phase === "player import") {
      const loaded = await fixture.dependencies.loadPlayer();
      fixture.dependencies.loadPlayer = async () => {
        await pending.promise;

        return loaded;
      };
    } else if (phase === "document") {
      fixture.dependencies.loadDocument = () =>
        Effect.promise(async () => {
          await pending.promise;

          return fixture.doc;
        });
    } else if (phase === "highlight import") {
      fixture.dependencies.loadHighlighting = async () => {
        await pending.promise;

        return fixture.highlighting;
      };
    } else {
      fixture.highlighting.getArticleCodeTokenizer = async () => {
        await pending.promise;

        return () => [];
      };
    }

    const dispose = fixture.start();
    await flush();
    fixture.controller.abort();
    dispose();
    await flush();
    const statuses = [...fixture.statuses];
    const events = [...fixture.events];

    pending.resolve(undefined);
    await flush();

    expect(fixture.statuses).toEqual(statuses);
    expect(fixture.events).toEqual(events);
    expect(events).not.toContain("start highlighting");

    if (phase === "player import" || phase === "document") {
      expect(fixture.players).toHaveLength(0);
      expect(events).not.toContain("append player");
    } else {
      expect(events.slice(-2).toSorted((a, b) => a.localeCompare(b))).toEqual(
        ["disconnect controls", "remove player"].toSorted((a, b) =>
          a.localeCompare(b)
        )
      );
    }
  });
}

test("releases the player when Giotto rejects its document before connection", async () => {
  const fixture = createFixture({ failDocument: true });
  fixture.start();
  await flush();

  expect(fixture.events).toEqual(["remove player"]);
  expect(fixture.statuses.at(-1)).toMatch(/unavailable/iu);
});

test("releases partial observer setup before publishing the failure fallback", async () => {
  const fixture = createFixture({ failObserver: true });
  const dispose = fixture.start();
  await flush();
  dispose();

  expect(fixture.events.toSorted((a, b) => a.localeCompare(b))).toEqual(
    [
      "append player",
      "observe controls",
      "disconnect controls",
      "remove player",
    ].toSorted((a, b) => a.localeCompare(b))
  );
  expect(fixture.statuses.at(-1)).toMatch(/unavailable/iu);
});

test("highlighting failure retains the usable player until unmount", async () => {
  const fixture = createFixture();
  fixture.highlighting.getArticleCodeTokenizer = async () =>
    await Promise.reject(new Error("Optional highlighting unavailable"));
  const dispose = fixture.start();
  await flush();

  expect(fixture.statuses.at(-1)).toBe("");
  expect(fixture.events.toSorted((a, b) => a.localeCompare(b))).toEqual(
    ["append player", "observe controls"].toSorted((a, b) => a.localeCompare(b))
  );
  dispose();
  await flush();
  expect(
    fixture.events.slice(-2).toSorted((a, b) => a.localeCompare(b))
  ).toEqual(
    ["disconnect controls", "remove player"].toSorted((a, b) =>
      a.localeCompare(b)
    )
  );
});

test("cancellation during highlighting acquisition still owns its returned cleanup", async () => {
  const fixture = createFixture();
  fixture.highlighting.highlightDiagramCode = () => {
    fixture.events.push("start highlighting");
    fixture.controller.abort();

    return () => {
      fixture.events.push("stop highlighting");
    };
  };

  const dispose = fixture.start();
  await flush();
  dispose();
  await flush();

  expect(fixture.events.toSorted((a, b) => a.localeCompare(b))).toEqual(
    [
      "append player",
      "observe controls",
      "start highlighting",
      "stop highlighting",
      "disconnect controls",
      "remove player",
    ].toSorted((a, b) => a.localeCompare(b))
  );
  expect(fixture.statuses.at(-1)).toBe("");
});

test("Strict Mode replay lets only the current activation mount", async () => {
  const first = createFixture({ code: false });

  const pending =
    Promise.withResolvers<
      Awaited<ReturnType<typeof first.dependencies.loadPlayer>>
    >();

  const loaded = await first.dependencies.loadPlayer();
  first.dependencies.loadPlayer = async () => await pending.promise;
  const disposeFirst = first.start();
  first.controller.abort();
  disposeFirst();

  const second = createFixture({ code: false });
  const disposeSecond = second.start();
  await flush();
  pending.resolve(loaded);
  await flush();

  expect(first.players).toHaveLength(0);
  expect(first.statuses).toHaveLength(1);
  expect(second.events.toSorted((a, b) => a.localeCompare(b))).toEqual(
    ["append player", "observe controls"].toSorted((a, b) => a.localeCompare(b))
  );
  disposeSecond();
  await flush();
  expect(
    second.events.slice(-2).toSorted((a, b) => a.localeCompare(b))
  ).toEqual(
    ["disconnect controls", "remove player"].toSorted((a, b) =>
      a.localeCompare(b)
    )
  );
});

test("rejects paths outside the repository diagram allowlist before loading", async () => {
  const fixture = createFixture();
  fixture.options.src = "https://example.test/untrusted.json";
  fixture.start();
  await flush();

  expect(fixture.events).toEqual([]);
  expect(fixture.players).toEqual([]);
  expect(fixture.statuses.at(-1)).toMatch(/unavailable/iu);
});

const loadWithFetch = async (
  fetch: (
    input: Parameters<typeof globalThis.fetch>[0],
    options?: RequestInit
  ) => Promise<Response>,
  signal?: AbortSignal
) =>
  await Effect.runPromiseExit(
    loadDiagramDocument("https://example.test/diagrams/example.json").pipe(
      Effect.provideService(FetchHttpClient.Fetch, fetch)
    ),
    { signal }
  );

test("HTTP loading preserves Giotto fields", async () => {
  const document = { custom: true, elements: [], scenes: [{ title: "Scene" }] };

  const success = await loadWithFetch(
    async () => await Promise.try(() => Response.json(document))
  );

  expect(Exit.isSuccess(success) && success.value).toEqual(document);
});

for (const [name, response] of [
  ["non-2xx status", new Response("unavailable", { status: 503 })],
  ["malformed JSON", new Response("invalid JSON")],
  ["invalid document", Response.json({ elements: "invalid" })],
] as const) {
  test(`HTTP loading rejects ${name}`, async () => {
    const failure = await loadWithFetch(
      async () => await Promise.try(() => response)
    );

    expect(Exit.isFailure(failure)).toBe(true);
  });
}

for (const phase of ["fetch", "body"]) {
  test(`HTTP cancellation aborts pending ${phase}`, async () => {
    const controller = new AbortController();
    const started = Promise.withResolvers<undefined>();
    const pendingFetch = Promise.withResolvers<Response>();
    const pendingBody = Promise.withResolvers<ArrayBuffer>();
    let requestSignal: AbortSignal | null | undefined;

    const result = loadWithFetch(async (_url, options) => {
      requestSignal = options?.signal;

      if (phase === "fetch") {
        started.resolve(undefined);

        return await pendingFetch.promise;
      }

      const response = new Response("");
      response.arrayBuffer = async () => {
        started.resolve(undefined);

        return await pendingBody.promise;
      };

      return response;
    }, controller.signal);

    await started.promise;
    controller.abort();

    expect(Exit.isFailure(await result)).toBe(true);
    expect(requestSignal?.aborted).toBe(true);
    pendingFetch.resolve(Response.json({ elements: [] }));
    pendingBody.resolve(new ArrayBuffer(0));
    await flush();
  });
}

test("an already aborted activation publishes nothing and acquires nothing", async () => {
  const fixture = createFixture();
  fixture.controller.abort();
  fixture.start();
  await flush();

  expect(fixture.statuses).toEqual([]);
  expect(fixture.players).toEqual([]);
  expect(fixture.events).toEqual([]);
});
