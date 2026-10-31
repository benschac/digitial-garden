import { Context, Effect, Exit, Layer, Schema, Scope } from "effect";
import initSqlJs from "sql.js";
import type { QueryExecResult } from "sql.js";

const SEED = `
  CREATE TABLE orders (id INTEGER, customer_id INTEGER, amount_cents INTEGER, created_at TEXT);
  INSERT INTO orders VALUES
    (1, 10, 4200, '2026-05-01'), (2, 10, 1500, '2026-05-03'),
    (3, 11, 9900, '2026-05-04'), (4, 12,  800, '2026-05-06');
  CREATE TABLE customers (id INTEGER, name TEXT, plan TEXT);
  INSERT INTO customers VALUES
    (10, 'Acme', 'pro'), (11, 'Globex', 'enterprise'), (12, 'Initech', 'free');
`;

export interface SampleDbResult {
  columns: string[];
  rows: unknown[][];
}

export interface SampleDbConnection {
  run: (sql: string) => void;
  exec: (sql: string) => QueryExecResult[];
  close: () => void;
}

export type InitializeSampleDb = () => Promise<{
  Database: new () => SampleDbConnection;
}>;

export class SampleDbInitializationError extends Schema.TaggedError<SampleDbInitializationError>()(
  "SampleDbInitializationError",
  { cause: Schema.Defect() }
) {}

export class SampleDbQueryError extends Schema.TaggedError<SampleDbQueryError>()(
  "SampleDbQueryError",
  { cause: Schema.Defect() }
) {}

export class SampleDb extends Context.Service<
  SampleDb,
  {
    query: (
      sql: string
    ) => Effect.Effect<
      SampleDbResult,
      SampleDbInitializationError | SampleDbQueryError
    >;
  }
>()("web/agent/lib/SampleDb") {}

export const makeSampleDbLayer = (initialize: InitializeSampleDb = initSqlJs) =>
  Layer.effect(
    SampleDb,
    Effect.gen(function* initializeSampleDbService() {
      const lifetime = yield* Effect.scope;

      const database = yield* Effect.cachedWithTTL(
        Effect.gen(function* initializeSampleDb() {
          const SQL = yield* Effect.tryPromise({
            catch: (cause) => new SampleDbInitializationError({ cause }),
            try: initialize,
          });

          const attempt = yield* Scope.fork(lifetime, "sequential");

          return yield* Effect.gen(function* seedSampleDb() {
            const connection = yield* Effect.acquireRelease(
              Effect.try({
                catch: (cause) => new SampleDbInitializationError({ cause }),
                try: () => new SQL.Database(),
              }),
              (acquired) => Effect.sync(() => acquired.close())
            );

            yield* Effect.try({
              catch: (cause) => new SampleDbInitializationError({ cause }),
              try: () => connection.run(SEED),
            });

            return connection;
          }).pipe(
            Effect.provideService(Scope.Scope, attempt),
            Effect.onExit((exit) =>
              Exit.isFailure(exit) ? Scope.close(attempt, exit) : Effect.void
            )
          );
        }),
        (exit) => (Exit.isSuccess(exit) ? Infinity : 0)
      );

      const query = Effect.fn("SampleDb.query")(function* query(sql: string) {
        const connection = yield* database;

        return yield* Effect.try({
          catch: (cause) => new SampleDbQueryError({ cause }),
          try: (): SampleDbResult => {
            const [result] = connection.exec(sql);

            return result
              ? { columns: result.columns, rows: result.values }
              : { columns: [], rows: [] };
          },
        });
      });

      return SampleDb.of({ query });
    })
  );

export const sampleDbLive = makeSampleDbLayer();
