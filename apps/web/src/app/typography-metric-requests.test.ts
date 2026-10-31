import { describe, expect, test } from "bun:test";

import { createTypographyMetricRequests } from "./typography-metric-requests";

const payload = {
  metrics: {
    ascent: 800,
    capHeight: 700,
    descent: -200,
    familyName: "Example",
    fullName: "Example Regular",
    lineGap: 0,
    postscriptName: "Example-Regular",
    unitsPerEm: 1000,
    xHeight: 500,
    xWidthAvg: 520,
  },
  source: "fonts/example.woff2",
};

type MetricResponse = Pick<Response, "ok" | "json">;

const controlledRequests = () => {
  const calls: {
    url: string;
    signal: AbortSignal;
    resolve: (response: MetricResponse) => void;
    reject: (cause: unknown) => void;
  }[] = [];

  const request = createTypographyMetricRequests((url, signal) => {
    const response = Promise.withResolvers<MetricResponse>();
    calls.push({ signal, url, ...response });

    return response.promise;
  });

  const call = (index: number) => {
    const value = calls[index];

    if (!value) {
      throw new Error(`Request ${index} did not start`);
    }

    return value;
  };

  return { call, calls, request };
};

const response = (value: typeof payload = payload): MetricResponse => ({
  json: () => Promise.resolve(value),
  ok: true,
});

const settleFailure = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error("Expected the request to reject");
};

describe("typography metric requests", () => {
  test("coalesces simultaneous consumers of the exact asset URL", async () => {
    const owner = controlledRequests();

    const first = owner.request(
      "/metrics/example.woff2.json",
      new AbortController().signal
    );

    const second = owner.request(
      "/metrics/example.woff2.json",
      new AbortController().signal
    );

    expect(owner.calls).toHaveLength(1);
    owner.call(0).resolve(response());
    const results = await Promise.all([first, second]);
    expect(results[0]).toEqual({ ...payload, verified: true });
    expect(results[1]).toBe(results[0]);
  });

  test("keeps distinct assets and production/development URLs independent", async () => {
    const owner = controlledRequests();

    const urls = [
      "/metrics/example.woff2.json",
      "/metrics/other.woff2.json",
      "/api/typography-metrics?asset=example.woff2",
    ];

    const results = urls.map((url) =>
      owner.request(url, new AbortController().signal)
    );

    expect(owner.calls.map((call) => call.url)).toEqual(urls);

    for (const call of owner.calls) {
      call.resolve(response());
    }

    await Promise.all(results);
  });

  test("canceling one subscriber preserves another subscriber's request", async () => {
    const owner = controlledRequests();
    const controller = new AbortController();
    const canceled = owner.request("/metrics/example", controller.signal);

    const retained = owner.request(
      "/metrics/example",
      new AbortController().signal
    );

    const cancellation = settleFailure(canceled);
    controller.abort();
    expect(await cancellation).toBeInstanceOf(Error);
    expect(owner.call(0).signal.aborted).toBe(false);
    owner.call(0).resolve(response());
    expect(await retained).toEqual({ ...payload, verified: true });
    expect(owner.calls).toHaveLength(1);
  });

  test("the final cancellation aborts unused work and allows an immediate replacement", async () => {
    const owner = controlledRequests();
    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = owner.request("/metrics/example", firstController.signal);
    const second = owner.request("/metrics/example", secondController.signal);
    const firstCanceled = settleFailure(first);
    const secondCanceled = settleFailure(second);
    firstController.abort();
    expect(await firstCanceled).toBeInstanceOf(Error);
    expect(owner.call(0).signal.aborted).toBe(false);
    secondController.abort();
    expect(await secondCanceled).toBeInstanceOf(Error);
    expect(owner.call(0).signal.aborted).toBe(true);

    const replacement = owner.request(
      "/metrics/example",
      new AbortController().signal
    );

    expect(owner.calls).toHaveLength(2);
    owner.call(0).resolve(response({ ...payload, source: "stale" }));
    owner.call(1).resolve(response());
    expect(await replacement).toEqual({ ...payload, verified: true });
  });

  test("does not start work for an already aborted subscriber", async () => {
    const owner = controlledRequests();
    const controller = new AbortController();
    controller.abort();
    await expect(
      owner.request("/metrics/example", controller.signal)
    ).rejects.toThrow();
    expect(owner.calls).toHaveLength(0);
  });

  test("shared request failures expire so a later consumer can retry", async () => {
    const owner = controlledRequests();

    const first = owner.request(
      "/metrics/example",
      new AbortController().signal
    );

    const second = owner.request(
      "/metrics/example",
      new AbortController().signal
    );

    const firstFailure = settleFailure(first);
    const secondFailure = settleFailure(second);
    owner.call(0).reject(new Error("Offline"));

    for (const error of await Promise.all([firstFailure, secondFailure])) {
      expect(error).toBeInstanceOf(Error);
    }

    const retry = owner.request(
      "/metrics/example",
      new AbortController().signal
    );

    expect(owner.calls).toHaveLength(2);
    owner.call(1).resolve(response());
    expect(await retry).toEqual({ ...payload, verified: true });
  });

  test.each(["status", "json", "schema"] as const)(
    "rejects %s failures without retaining them",
    async (stage) => {
      const owner = controlledRequests();

      const result = owner.request(
        "/metrics/example",
        new AbortController().signal
      );

      const failure = settleFailure(result);

      let invalid = response({
        ...payload,
        metrics: { ...payload.metrics, unitsPerEm: 0 },
      });

      if (stage === "status") {
        invalid = { ...response(), ok: false };
      } else if (stage === "json") {
        invalid = {
          json: () => Promise.reject(new Error("Invalid JSON")),
          ok: true,
        };
      }

      owner.call(0).resolve(invalid);
      expect(await failure).toBeInstanceOf(Error);

      const retry = owner.request(
        "/metrics/example",
        new AbortController().signal
      );

      owner.call(1).resolve(response());
      expect(await retry).toEqual({ ...payload, verified: true });
    }
  );

  test("cancellation while decoding suppresses a late result", async () => {
    const owner = controlledRequests();
    const controller = new AbortController();
    const decoded = Promise.withResolvers<unknown>();
    const decodingStarted = Promise.withResolvers<undefined>();
    const result = owner.request("/metrics/example", controller.signal);
    const failure = settleFailure(result);
    owner.call(0).resolve({
      json: () => {
        decodingStarted.resolve(undefined);

        return decoded.promise;
      },
      ok: true,
    });
    await decodingStarted.promise;
    controller.abort();
    expect(await failure).toBeInstanceOf(Error);
    decoded.resolve({ ...payload, source: "stale" });

    const retry = owner.request(
      "/metrics/example",
      new AbortController().signal
    );

    owner.call(1).resolve(response());
    expect(await retry).toEqual({ ...payload, verified: true });
  });

  test("completed successes are released so later requests see fresh metrics", async () => {
    const owner = controlledRequests();

    const first = owner.request(
      "/metrics/example",
      new AbortController().signal
    );

    owner.call(0).resolve(response());
    await first;

    const next = owner.request(
      "/metrics/example",
      new AbortController().signal
    );

    expect(owner.calls).toHaveLength(2);
    owner.call(1).resolve(response({ ...payload, source: "updated" }));
    expect(await next).toEqual({
      ...payload,
      source: "updated",
      verified: true,
    });
  });
});
