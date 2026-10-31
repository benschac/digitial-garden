import { Effect, ManagedRuntime, Schema } from "effect";
import type { Layer } from "effect";

import { SampleDb, sampleDbLive } from "./sample-db-service";

export class SampleDbDisposedError extends Schema.TaggedError<SampleDbDisposedError>()(
  "SampleDbDisposedError",
  {}
) {}

export const createSampleDb = (layer: Layer.Layer<SampleDb> = sampleDbLive) => {
  const runtime = ManagedRuntime.make(layer);
  let disposal: Promise<void> | undefined;

  return {
    dispose() {
      disposal ??= runtime.dispose();

      return disposal;
    },
    runReadOnlySql(sql: string) {
      if (disposal) {
        return Promise.reject(new SampleDbDisposedError());
      }

      return runtime.runPromise(
        SampleDb.pipe(Effect.flatMap((database) => database.query(sql)))
      );
    },
  };
};

const sampleDb = createSampleDb();

export const { runReadOnlySql } = sampleDb;
export const disposeSampleDb = sampleDb.dispose;
