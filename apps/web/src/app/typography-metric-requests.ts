import { Cache, Data, Effect } from "effect";

import { decodeTypographyMetrics } from "./typography-metrics-schema";

type FetchMetrics = (
  url: string,
  signal: AbortSignal
) => Promise<Pick<Response, "ok" | "json">>;

class TypographyMetricError extends Data.TaggedError("TypographyMetricError")<{
  url: string;
  stage: "request" | "response" | "decode";
  cause: unknown;
}> {}

export const createTypographyMetricRequests = (
  fetchMetrics: FetchMetrics = (url, signal) => fetch(url, { signal })
) => {
  const requests = Effect.runSync(
    Cache.make({
      capacity: Infinity,
      lookup: Effect.fnUntraced(function* loadTypographyMetrics(url: string) {
        const response = yield* Effect.tryPromise({
          catch: (cause) =>
            new TypographyMetricError({ cause, stage: "request", url }),
          try: (signal) => fetchMetrics(url, signal),
        });

        if (!response.ok) {
          return yield* new TypographyMetricError({
            cause: "Metrics unavailable for this font asset",
            stage: "response",
            url,
          });
        }

        const payload: unknown = yield* Effect.tryPromise({
          catch: (cause) =>
            new TypographyMetricError({ cause, stage: "decode", url }),
          try: () => response.json(),
        });

        const result = yield* Effect.try({
          catch: (cause) =>
            new TypographyMetricError({ cause, stage: "decode", url }),
          try: () => decodeTypographyMetrics(payload),
        });

        return { ...result, verified: true as const };
      }),
      timeToLive: 0,
    })
  );

  return async (url: string, signal: AbortSignal) => {
    signal.throwIfAborted();

    return await Effect.runPromise(Cache.get(requests, url), { signal });
  };
};

export const requestTypographyMetrics = createTypographyMetricRequests();
