import type { ThemedToken } from "shiki";

/** Matches the fenced-code theme in lib/content/collection.ts. */
export const articleCodeTheme = {
  name: "github-dark-dimmed",
  background: "#22272e",
  foreground: "#adbac7",
} as const;

export type ArticleCodeTokens = ThemedToken[][];
type Tokenize = (code: string) => ArticleCodeTokens;
let tokenizer: Promise<Tokenize> | undefined;

// The chat CodeBlock helper uses a light/dark theme pair. Article figures use
// the article's single theme, loading only TypeScript and that theme on demand.
export function getArticleCodeTokenizer(): Promise<Tokenize> {
  tokenizer ??= Promise.all([
    import("shiki/core"),
    import("shiki/engine/javascript"),
    import("shiki/langs/typescript.mjs"),
    import("shiki/themes/github-dark-dimmed.mjs"),
  ])
    .then(async ([{ createHighlighterCore }, engine, language, theme]) => {
      const highlighter = await createHighlighterCore({
        themes: [theme.default],
        langs: [language.default],
        engine: engine.createJavaScriptRegexEngine(),
      });
      const cache = new Map<string, ArticleCodeTokens>();
      return (code: string) => {
        let tokens = cache.get(code);
        if (!tokens) {
          tokens = highlighter.codeToTokens(code, {
            lang: "typescript",
            theme: articleCodeTheme.name,
          }).tokens;
          cache.set(code, tokens);
        }
        return tokens;
      };
    })
    .catch((error: unknown) => {
      tokenizer = undefined;
      throw error;
    });
  return tokenizer;
}

/** Giotto redraws its SVG each frame; observe only top-level replacements. */
export function highlightDiagramCode(svg: SVGElement, tokenize: Tokenize) {
  const fragments = new Map<string, DocumentFragment>();
  const highlight = () => {
    for (const line of svg.querySelectorAll<SVGTextElement>(".g-code-text")) {
      const source = line.textContent ?? "";
      let fragment = fragments.get(source);
      if (!fragment) {
        fragment = document.createDocumentFragment();
        const prefix = source.match(/^[▶ ]+\d+\s+/)?.[0] ?? "";
        if (prefix) {
          const number = document.createElementNS(svg.namespaceURI, "tspan");
          number.setAttribute("fill", "#768390");
          number.textContent = prefix;
          fragment.append(number);
        }
        for (const token of tokenize(source.slice(prefix.length))[0] ?? []) {
          const span = document.createElementNS(svg.namespaceURI, "tspan");
          span.setAttribute("fill", token.color ?? articleCodeTheme.foreground);
          span.textContent = token.content;
          fragment.append(span);
        }
        fragments.set(source, fragment);
      }
      line.replaceChildren(fragment.cloneNode(true));
    }
  };
  highlight();
  // A shared element-visibility/resize hook cannot observe SVG replacement.
  // No subtree observation: coloring tspans must not retrigger this observer.
  const observer = new MutationObserver(highlight);
  observer.observe(svg, { childList: true });
  return () => observer.disconnect();
}
