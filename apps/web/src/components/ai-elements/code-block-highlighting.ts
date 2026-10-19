import { Cache, Data, Effect, Exit, Option } from "effect";
import { createHighlighter } from "shiki";
import type { BundledLanguage, ThemedToken } from "shiki";

export interface TokenizedCode {
  tokens: ThemedToken[][];
  fg: string;
  bg: string;
}

type ChatHighlighter = Pick<
  Awaited<ReturnType<typeof createHighlighter>>,
  "getLoadedLanguages" | "codeToTokens"
>;

type InitializeHighlighter = (
  language: BundledLanguage,
) => Promise<ChatHighlighter>;

class HighlightRequest extends Data.Class<{
  code: string;
  language: BundledLanguage;
}> {}

const initializeHighlighter: InitializeHighlighter = (language) =>
  createHighlighter({
    langs: [language],
    themes: ["github-light", "github-dark"],
  });

export const createCodeHighlighting = (
  initialize: InitializeHighlighter = initializeHighlighter,
  capacity = 100,
) => {
  const highlighters = Effect.runSync(
    Cache.makeWith(
      (language: BundledLanguage) =>
        Effect.tryPromise(() => initialize(language)),
      {
        capacity: Infinity,
        timeToLive: (exit) => (Exit.isSuccess(exit) ? Infinity : 0),
      },
    ),
  );

  const tokens = Effect.runSync(
    Cache.makeWith(
      Effect.fnUntraced(function* ({ code, language }: HighlightRequest) {
        const highlighter = yield* Cache.get(highlighters, language);
        return yield* Effect.try(() => {
          const result = highlighter.codeToTokens(code, {
            lang: highlighter.getLoadedLanguages().includes(language)
              ? language
              : "text",
            themes: { dark: "github-dark", light: "github-light" },
          });
          return {
            bg: result.bg ?? "transparent",
            fg: result.fg ?? "inherit",
            tokens: result.tokens,
          };
        });
      }),
      {
        capacity,
        timeToLive: (exit) => (Exit.isSuccess(exit) ? Infinity : 0),
      },
    ),
  );

  const getCached = (code: string, language: BundledLanguage) =>
    Option.getOrNull(
      Effect.runSync(
        Cache.getSuccess(tokens, new HighlightRequest({ code, language })),
      ),
    );

  const highlight = (code: string, language: BundledLanguage) =>
    Effect.runPromise(
      Cache.get(tokens, new HighlightRequest({ code, language })).pipe(
        Effect.catch(() => Effect.succeed(null)),
      ),
    );

  const subscribe = (
    code: string,
    language: BundledLanguage,
    callback: (result: TokenizedCode) => void,
  ) => {
    const subscription: { callback: typeof callback | null } = { callback };
    void highlight(code, language).then((result) => {
      const listener = subscription.callback;
      subscription.callback = null;
      if (result) listener?.(result);
    });
    return () => {
      subscription.callback = null;
    };
  };

  return { getCached, highlight, subscribe };
};

export const codeHighlighting = createCodeHighlighting();
