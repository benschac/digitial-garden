import { Cause, Effect, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import type { GiottoPlayer } from "giotto/player";

import { articleCodeTheme } from "./article-code-theme";
import type { getArticleCodeTokenizer } from "./article-code-theme";

const diagramDocumentSchema = Schema.StructWithRest(
  Schema.Struct({ elements: Schema.Array(Schema.Unknown) }),
  [Schema.Record(Schema.String, Schema.Unknown)]
);

export const decodeDiagramDocument = Schema.decodeUnknownSync(
  diagramDocumentSchema
);

export const loadDiagramDocument = Effect.fnUntraced(function* loadDocument(
  src: string
) {
  const client = yield* HttpClient.HttpClient;

  return yield* client
    .get(src)
    .pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(diagramDocumentSchema))
    );
}, Effect.provide(FetchHttpClient.layer));

interface DiagramRoot<Control, Svg> {
  querySelector: (selector: "svg") => Svg | null;
  querySelectorAll: {
    (
      selector: "button[title]"
    ): Iterable<Pick<HTMLButtonElement, "title" | "setAttribute">>;
    (selector: '[part="controls"]'): Iterable<Control>;
  };
}

interface DiagramPlayer<Control, Svg> {
  shadowRoot: DiagramRoot<Control, Svg> | null;
  className: string;
  doc: object;
  figStyle: GiottoPlayer["figStyle"];
  setAttribute: (name: string, value: string) => void;
  remove: () => void;
}

interface DiagramMount<Player = GiottoPlayer> {
  autoplay: boolean;
  captionId: string;
  container: { append: (player: Player) => void };
  onStatus: (status: string) => void;
  playerClassName: string;
  signal: AbortSignal;
  src: string;
  theme?: "light" | "dark";
}

export interface DiagramDependencies<
  Control = Node,
  Svg = SVGElement,
  Player extends DiagramPlayer<Control, Svg> = DiagramPlayer<Control, Svg>,
> {
  createControlsObserver: (listener: () => void) => {
    observe: (control: Control, options: MutationObserverInit) => void;
    disconnect: () => void;
  };
  loadDocument: (
    src: string
  ) => Effect.Effect<
    typeof diagramDocumentSchema.Type,
    Effect.Error<ReturnType<typeof loadDiagramDocument>>
  >;
  loadHighlighting: () => Promise<{
    getArticleCodeTokenizer: typeof getArticleCodeTokenizer;
    highlightDiagramCode: (
      svg: Svg,
      tokenize: Awaited<ReturnType<typeof getArticleCodeTokenizer>>
    ) => () => void;
  }>;
  loadPlayer: () => Promise<{ GiottoPlayer: new () => Player }>;
}

const browserDependencies = {
  createControlsObserver: (listener: () => void) =>
    new MutationObserver(listener),
  loadDocument: loadDiagramDocument,
  loadHighlighting: async () => await import("./article-code-theme"),
  loadPlayer: async () => await import("giotto/player"),
} satisfies DiagramDependencies;

const diagramLifetime = Effect.fnUntraced(function* runDiagramLifetime<
  Control,
  Svg,
  Player extends DiagramPlayer<Control, Svg>,
>(
  options: DiagramMount<Player>,
  dependencies: DiagramDependencies<Control, Svg, Player>,
  isActive: () => boolean
) {
  const {
    autoplay,
    captionId,
    container,
    onStatus,
    playerClassName,
    src,
    theme,
  } = options;

  yield* Effect.sync(() => {
    options.signal.throwIfAborted();
    onStatus("Loading interactive diagram…");
  });
  yield* Effect.try(() => {
    if (!/^\/diagrams\/[a-z0-9-]+\.json$/u.test(src)) {
      throw new Error("Use a repository-owned /diagrams/name.json file.");
    }
  });

  const [module, doc] = yield* Effect.all(
    [
      Effect.tryPromise(dependencies.loadPlayer),
      dependencies.loadDocument(src),
    ],
    { concurrency: "unbounded" }
  );

  const element = yield* Effect.acquireRelease(
    Effect.sync(() => new module.GiottoPlayer()),
    (player) =>
      Effect.sync(() => {
        player.remove();
      })
  );

  yield* Effect.sync(() => {
    options.signal.throwIfAborted();
    element.setAttribute("autoplay", String(autoplay));

    if (theme) {
      element.setAttribute("theme", theme);
    }

    element.setAttribute("aria-describedby", captionId);
    element.className = playerClassName;
    element.figStyle = {
      codeFill: articleCodeTheme.background,
      codeText: articleCodeTheme.foreground,
      dark: {
        codeFill: articleCodeTheme.background,
        codeText: articleCodeTheme.foreground,
        packetText: "#202d27",
      },
      font: "var(--font-ui, system-ui), sans-serif",
      radius: 3,
      shadow: false,
    };
    element.doc = doc;
    options.signal.throwIfAborted();
    container.append(element);
  });

  const root = element.shadowRoot;

  const labelControls = () => {
    if (!isActive()) {
      return;
    }

    for (const button of root?.querySelectorAll("button[title]") ?? []) {
      button.setAttribute("aria-label", button.title);
    }
  };

  yield* Effect.sync(labelControls);

  if (root) {
    const observer = yield* Effect.acquireRelease(
      Effect.sync(() => dependencies.createControlsObserver(labelControls)),
      (resource) =>
        Effect.sync(() => {
          resource.disconnect();
        })
    );

    yield* Effect.sync(() => {
      for (const part of root.querySelectorAll('[part="controls"]')) {
        observer.observe(part, { childList: true });
      }
    });
  }

  yield* Effect.sync(() => {
    if (isActive()) {
      onStatus("");
    }
  });

  if (JSON.stringify(doc).includes('"type":"code"')) {
    yield* Effect.gen(function* highlightCode() {
      const { getArticleCodeTokenizer, highlightDiagramCode } =
        yield* Effect.tryPromise(dependencies.loadHighlighting);

      const tokenize = yield* Effect.tryPromise(getArticleCodeTokenizer);

      yield* Effect.acquireRelease(
        Effect.sync((): ReturnType<typeof highlightDiagramCode> | undefined => {
          if (!isActive()) {
            return undefined;
          }

          const svg = root?.querySelector("svg");

          return svg === null || svg === undefined
            ? undefined
            : highlightDiagramCode(svg, tokenize);
        }),
        (stopHighlighting) => Effect.sync(() => stopHighlighting?.())
      );
    }).pipe(
      Effect.catchCauseIf(
        (cause) => !Cause.hasInterrupts(cause),
        () => Effect.void
      )
    );
  }

  return yield* Effect.never;
});

export const createAnimatedDiagramMount =
  <Control, Svg, Player extends DiagramPlayer<Control, Svg>>(
    dependencies: DiagramDependencies<Control, Svg, Player>
  ) =>
  (options: DiagramMount<Player>) => {
    let disposed = false;
    const isActive = () => !disposed && !options.signal.aborted;

    const fiber = Effect.runFork(
      diagramLifetime(options, dependencies, isActive).pipe(
        Effect.scoped,
        Effect.catchCause((cause) =>
          Effect.sync(() => {
            if (isActive() && !Cause.hasInterrupts(cause)) {
              options.onStatus(
                "Animation unavailable. Read the description below."
              );
            }
          })
        )
      ),
      { signal: options.signal }
    );

    return () => {
      disposed = true;
      fiber.interruptUnsafe();
    };
  };

export const mountAnimatedDiagram = (
  options: DiagramMount,
  dependencies = browserDependencies
) => createAnimatedDiagramMount(dependencies)(options);
