import { Effect, ManagedRuntime, Schema } from "effect";
import type { Layer } from "effect";

import { makeSampleDbLayer, SampleDb } from "./sample-db-service";

export class SampleDbDisposedError extends Schema.TaggedError<SampleDbDisposedError>()(
  "SampleDbDisposedError",
  {},
) {}

export function createSampleDb(
  layer: Layer.Layer<SampleDb> = makeSampleDbLayer(),
) {
  const runtime = ManagedRuntime.make(layer);
  let disposal: Promise<void> | undefined;

  return {
    runReadOnlySql(sql: string) {
      if (disposal) return Promise.reject(new SampleDbDisposedError());
      return runtime.runPromise(
        Effect.flatMap(SampleDb, (database) => database.query(sql)),
      );
    },
    dispose() {
      disposal ??= runtime.dispose();
      return disposal;
    },
  };
}

const sampleDb = createSampleDb();

export const runReadOnlySql = sampleDb.runReadOnlySql;
export const disposeSampleDb = sampleDb.dispose;
