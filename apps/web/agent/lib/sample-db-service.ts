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
  run(sql: string): unknown;
  exec(sql: string): QueryExecResult[];
  close(): void;
}

export type InitializeSampleDb = () => Promise<{
  Database: new () => SampleDbConnection;
}>;

export class SampleDbInitializationError extends Schema.TaggedError<SampleDbInitializationError>()(
  "SampleDbInitializationError",
  { cause: Schema.Defect() },
) {}

export class SampleDbQueryError extends Schema.TaggedError<SampleDbQueryError>()(
  "SampleDbQueryError",
  { cause: Schema.Defect() },
) {}

export class SampleDb extends Context.Service<
  SampleDb,
  {
    query(
      sql: string,
    ): Effect.Effect<
      SampleDbResult,
      SampleDbInitializationError | SampleDbQueryError
    >;
  }
>()("web/agent/lib/SampleDb") {}

export const makeSampleDbLayer = (initialize: InitializeSampleDb = initSqlJs) =>
  Layer.effect(
    SampleDb,
    Effect.gen(function* () {
      const lifetime = yield* Effect.scope;
      const database = yield* Effect.cachedWithTTL(
        Effect.gen(function* () {
          const SQL = yield* Effect.tryPromise({
            try: initialize,
            catch: (cause) => new SampleDbInitializationError({ cause }),
          });
          const attempt = yield* Scope.fork(lifetime, "sequential");
          return yield* Effect.gen(function* () {
            const connection = yield* Effect.acquireRelease(
              Effect.try({
                try: () => new SQL.Database(),
                catch: (cause) => new SampleDbInitializationError({ cause }),
              }),
              (connection) => Effect.sync(() => connection.close()),
            );
            yield* Effect.try({
              try: () => connection.run(SEED),
              catch: (cause) => new SampleDbInitializationError({ cause }),
            });
            return connection;
          }).pipe(
            Effect.provideService(Scope.Scope, attempt),
            Effect.onExit((exit) =>
              Exit.isFailure(exit) ? Scope.close(attempt, exit) : Effect.void,
            ),
          );
        }),
        (exit) => (Exit.isSuccess(exit) ? Infinity : 0),
      );

      const query = Effect.fn("SampleDb.query")(function* (sql: string) {
        const connection = yield* database;
        return yield* Effect.try({
          try: (): SampleDbResult => {
            const [result] = connection.exec(sql);
            return result
              ? { columns: result.columns, rows: result.values }
              : { columns: [], rows: [] };
          },
          catch: (cause) => new SampleDbQueryError({ cause }),
        });
      });

      return SampleDb.of({ query });
    }),
  );
