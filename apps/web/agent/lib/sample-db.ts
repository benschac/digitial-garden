import { Effect, ManagedRuntime, Schema } from "effect";
import type { Layer } from "effect";

import { SampleDb, sampleDbLive } from "./sample-db-service";

export class SampleDbDisposedError extends Schema.TaggedError<
  SampleDbDisposedError,
  { readonly brand: unique symbol }
>()("SampleDbDisposedError", {}) {}

export const createSampleDb = (layer: Layer.Layer<SampleDb> = sampleDbLive) => {
  const runtime = ManagedRuntime.make(layer);
  let disposal: Promise<void> | undefined;

  return {
    dispose() {
      disposal ??= runtime.dispose();

      return disposal;
    },
    async runReadOnlySql(sql: string) {
      if (disposal) {
        throw new SampleDbDisposedError();
      }

      return await runtime.runPromise(
        SampleDb.pipe(Effect.flatMap((database) => database.query(sql)))
      );
    },
  };
};

const sampleDb = createSampleDb();

export const runReadOnlySql = sampleDb.runReadOnlySql.bind(sampleDb);
export const disposeSampleDb = sampleDb.dispose.bind(sampleDb);
