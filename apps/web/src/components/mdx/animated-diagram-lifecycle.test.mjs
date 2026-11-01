import { afterEach, expect, test } from "bun:test";
import { setImmediate } from "node:timers/promises";

import { Effect, Exit } from "effect";
import { FetchHttpClient } from "effect/http";

import {
  loadDiagramDocument,
  mountAnimatedDiagram,
} from "./animated-diagram-lifecycle";

const pendingDisposals = new Set();

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
  const events = [];
  const statuses = [];
  const players = [];
  const buttons = [{ attributes: new Map(), title: "Play" }];
  const doc = { elements: code ? [{ type: "code" }] : [] };
  let labelControls;

  const root = {
    querySelector: () => ({}),
    querySelectorAll: (selector) =>
      selector === "button[title]"
        ? buttons.map((button) => ({
            ...button,
            setAttribute: (key, value) => button.attributes.set(key, value),
          }))
        : [{}],
  };

  class Player {
    attributes = new Map();
    shadowRoot = root;

    constructor() {
      players.push(this);
    }

    setAttribute(key, value) {
      this.attributes.set(key, value);
    }

    get doc() {
      return this.document;
    }

    set doc(value) {
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
    getArticleCodeTokenizer: () => Promise.resolve(() => []),
    highlightDiagramCode: () => {
      events.push("start highlighting");

      return () => events.push("stop highlighting");
    },
  };

  const dependencies = {
    createControlsObserver: (listener) => {
      labelControls = listener;

      return {
        disconnect: () => events.push("disconnect controls"),
        observe: () => {
          events.push("observe controls");

          if (failObserver) {
            throw new Error("Observer setup failed");
          }
        },
      };
    },
    loadDocument: () => Effect.succeed(doc),
    loadHighlighting: () => Promise.resolve(highlighting),
    loadPlayer: () => Promise.resolve({ GiottoPlayer: Player }),
  };

  const options = {
    autoplay: true,
    captionId: "diagram-caption",
    container: { append: () => events.push("append player") },
    onStatus: (status) => statuses.push(status),
    playerClassName: "article-player",
    signal: controller.signal,
    src: "/diagrams/example.json",
    theme: "dark",
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
      const dispose = mountAnimatedDiagram(options, dependencies);
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
  expect(fixture.events.toSorted()).toEqual(
    ["append player", "observe controls", "start highlighting"].toSorted()
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

  expect(fixture.events.slice(setupEventCount).toSorted()).toEqual(
    ["stop highlighting", "disconnect controls", "remove player"].toSorted()
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
    const pending = Promise.withResolvers();

    if (phase === "player import") {
      const loaded = await fixture.dependencies.loadPlayer();
      fixture.dependencies.loadPlayer = () => pending.promise;
      pending.value = loaded;
    } else if (phase === "document") {
      fixture.dependencies.loadDocument = () =>
        Effect.promise(() => pending.promise);
      pending.value = fixture.doc;
    } else if (phase === "highlight import") {
      fixture.dependencies.loadHighlighting = () => pending.promise;
      pending.value = fixture.highlighting;
    } else {
      fixture.highlighting.getArticleCodeTokenizer = () => pending.promise;
      pending.value = () => [];
    }

    const dispose = fixture.start();
    await flush();
    fixture.controller.abort();
    dispose();
    await flush();
    const statuses = [...fixture.statuses];
    const events = [...fixture.events];

    pending.resolve(pending.value);
    await flush();

    expect(fixture.statuses).toEqual(statuses);
    expect(fixture.events).toEqual(events);
    expect(events).not.toContain("start highlighting");

    if (phase === "player import" || phase === "document") {
      expect(fixture.players).toHaveLength(0);
      expect(events).not.toContain("append player");
    } else {
      expect(events.slice(-2).toSorted()).toEqual(
        ["disconnect controls", "remove player"].toSorted()
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

  expect(fixture.events.toSorted()).toEqual(
    [
      "append player",
      "observe controls",
      "disconnect controls",
      "remove player",
    ].toSorted()
  );
  expect(fixture.statuses.at(-1)).toMatch(/unavailable/iu);
});

test("highlighting failure retains the usable player until unmount", async () => {
  const fixture = createFixture();
  fixture.highlighting.getArticleCodeTokenizer = () =>
    Promise.reject(new Error("Optional highlighting unavailable"));
  const dispose = fixture.start();
  await flush();

  expect(fixture.statuses.at(-1)).toBe("");
  expect(fixture.events.toSorted()).toEqual(
    ["append player", "observe controls"].toSorted()
  );
  dispose();
  await flush();
  expect(fixture.events.slice(-2).toSorted()).toEqual(
    ["disconnect controls", "remove player"].toSorted()
  );
});

test("cancellation during highlighting acquisition still owns its returned cleanup", async () => {
  const fixture = createFixture();
  fixture.highlighting.highlightDiagramCode = () => {
    fixture.events.push("start highlighting");
    fixture.controller.abort();

    return () => fixture.events.push("stop highlighting");
  };

  const dispose = fixture.start();
  await flush();
  dispose();
  await flush();

  expect(fixture.events.toSorted()).toEqual(
    [
      "append player",
      "observe controls",
      "start highlighting",
      "stop highlighting",
      "disconnect controls",
      "remove player",
    ].toSorted()
  );
  expect(fixture.statuses.at(-1)).toBe("");
});

test("Strict Mode replay lets only the current activation mount", async () => {
  const first = createFixture({ code: false });
  const pending = Promise.withResolvers();
  const loaded = await first.dependencies.loadPlayer();
  first.dependencies.loadPlayer = () => pending.promise;
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
  expect(second.events.toSorted()).toEqual(
    ["append player", "observe controls"].toSorted()
  );
  disposeSecond();
  await flush();
  expect(second.events.slice(-2).toSorted()).toEqual(
    ["disconnect controls", "remove player"].toSorted()
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

const loadWithFetch = (fetch, signal) =>
  Effect.runPromiseExit(
    loadDiagramDocument("https://example.test/diagrams/example.json").pipe(
      Effect.provideService(FetchHttpClient.Fetch, fetch)
    ),
    { signal }
  );

test("HTTP loading preserves Giotto fields", async () => {
  const document = { custom: true, elements: [], scenes: [{ title: "Scene" }] };

  const success = await loadWithFetch(() =>
    Promise.resolve(Response.json(document))
  );

  expect(Exit.isSuccess(success) && success.value).toEqual(document);
});

for (const [name, response] of [
  ["non-2xx status", new Response("unavailable", { status: 503 })],
  ["malformed JSON", new Response("invalid JSON")],
  ["invalid document", Response.json({ elements: "invalid" })],
]) {
  test(`HTTP loading rejects ${name}`, async () => {
    const failure = await loadWithFetch(() => Promise.resolve(response));
    expect(Exit.isFailure(failure)).toBe(true);
  });
}

for (const phase of ["fetch", "body"]) {
  test(`HTTP cancellation aborts pending ${phase}`, async () => {
    const controller = new AbortController();
    const started = Promise.withResolvers();
    const pending = Promise.withResolvers();
    let requestSignal;

    const result = loadWithFetch((_url, options) => {
      requestSignal = options.signal;

      if (phase === "fetch") {
        started.resolve();

        return pending.promise;
      }

      const response = new Response("");
      response.arrayBuffer = () => {
        started.resolve();

        return pending.promise;
      };

      return Promise.resolve(response);
    }, controller.signal);

    await started.promise;
    controller.abort();

    expect(Exit.isFailure(await result)).toBe(true);
    expect(requestSignal.aborted).toBe(true);
    pending.resolve(
      phase === "fetch" ? Response.json({ elements: [] }) : new ArrayBuffer(0)
    );
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
