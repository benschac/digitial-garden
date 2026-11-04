import { Cache, Data, Effect, Exit, Option, Schema } from "effect";
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
  language: BundledLanguage
) => Promise<ChatHighlighter>;

class CodeHighlightingError extends Schema.TaggedError<
  CodeHighlightingError,
  { readonly brand: unique symbol }
>()("CodeHighlightingError", {
  cause: Schema.Defect(),
  operation: Schema.Literals(["initialize", "tokenize"]),
}) {}

class HighlightRequest extends Data.Class<{
  code: string;
  language: BundledLanguage;
}> {}

const initializeHighlighter: InitializeHighlighter = async (language) =>
  await createHighlighter({
    langs: [language],
    themes: ["github-light", "github-dark"],
  });

interface HighlightSubscription {
  callback: ((result: TokenizedCode) => void) | null;
}

export const createCodeHighlighting = (
  initialize: InitializeHighlighter = initializeHighlighter,
  capacity = 100
) => {
  const highlighters = Effect.runSync(
    Cache.makeWith(
      (language: BundledLanguage) =>
        Effect.tryPromise({
          catch: (cause) =>
            new CodeHighlightingError({ cause, operation: "initialize" }),
          try: async () => await initialize(language),
        }),
      {
        capacity: Infinity,
        timeToLive: (exit) => (Exit.isSuccess(exit) ? Infinity : 0),
      }
    )
  );

  const tokens = Effect.runSync(
    Cache.makeWith(
      Effect.fnUntraced(function* tokens({ code, language }: HighlightRequest) {
        const highlighter = yield* Cache.get(highlighters, language);

        return yield* Effect.try({
          catch: (cause) =>
            new CodeHighlightingError({ cause, operation: "tokenize" }),
          try: () => {
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
          },
        });
      }),
      {
        capacity,
        timeToLive: (exit) => (Exit.isSuccess(exit) ? Infinity : 0),
      }
    )
  );

  const getCached = (code: string, language: BundledLanguage) =>
    Option.getOrNull(
      Effect.runSync(
        Cache.getSuccess(tokens, new HighlightRequest({ code, language }))
      )
    );

  const highlight = async (code: string, language: BundledLanguage) =>
    await Effect.runPromise(
      Cache.get(tokens, new HighlightRequest({ code, language })).pipe(
        Effect.orElseSucceed(() => null)
      )
    );

  const subscribe = (
    code: string,
    language: BundledLanguage,
    onHighlight: (result: TokenizedCode) => void
  ) => {
    const subscription: HighlightSubscription = {
      callback: onHighlight,
    };

    const notify = async () => {
      const result = await highlight(code, language);
      const listener = subscription.callback;
      subscription.callback = null;

      if (result) {
        listener?.(result);
      }
    };

    void notify();

    return () => {
      subscription.callback = null;
    };
  };

  return { getCached, highlight, subscribe };
};

export const codeHighlighting = createCodeHighlighting();
