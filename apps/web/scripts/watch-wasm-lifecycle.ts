import { Deferred, Effect, Queue, Schema, Stream } from "effect";

export type WatchWasmSignal = "SIGINT" | "SIGTERM";

export interface WatchWasmProcess {
  readonly exited: Promise<number>;
  kill(): void;
}

export interface WatchWasmDependencies {
  readonly targets: ReadonlyArray<{ path: string; recursive: boolean }>;
  watch(
    target: { path: string; recursive: boolean },
    onChange: () => void,
  ): { close(): void };
  spawn(): WatchWasmProcess;
  onSignal(signal: WatchWasmSignal, listener: () => void): void;
  offSignal(signal: WatchWasmSignal, listener: () => void): void;
  log(message: string): void;
  error(message: string): void;
  readonly watchingMessage: string;
}

export class WatchWasmError extends Schema.TaggedError<WatchWasmError>()(
  "WatchWasmError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const watchWasm = Effect.fn("watchWasm")(function* (
  dependencies: WatchWasmDependencies,
) {
  const attempt = <A>(operation: string, action: () => A) =>
    Effect.try({
      try: action,
      catch: (cause) => new WatchWasmError({ operation, cause }),
    });
  const report = (error: WatchWasmError) =>
    Effect.sync(() =>
      dependencies.error(
        `WASM ${error.operation} failed: ${String(error.cause)}`,
      ),
    );
  const cleanup = (operation: string, action: () => void) =>
    attempt(operation, action).pipe(Effect.catch(report));

  yield* Effect.scoped(
    Effect.gen(function* () {
      const stopped = yield* Deferred.make<undefined>();
      let acceptingChanges = true;
      const stop = () => {
        acceptingChanges = false;
        Deferred.doneUnsafe(stopped, Effect.succeed(undefined));
      };
      for (const signal of ["SIGINT", "SIGTERM"] as const) {
        yield* Effect.acquireRelease(
          attempt("signal registration", () =>
            dependencies.onSignal(signal, stop),
          ),
          () =>
            cleanup("signal removal", () =>
              dependencies.offSignal(signal, stop),
            ),
        );
      }

      const run = Effect.gen(function* () {
        const changes = yield* Effect.acquireRelease(
          Queue.sliding<undefined>(1),
          Queue.shutdown,
        );
        const pending = yield* Effect.acquireRelease(
          Queue.dropping<undefined>(1),
          Queue.shutdown,
        );
        const onChange = () => {
          if (acceptingChanges) Queue.offerUnsafe(changes, undefined);
        };
        for (const target of dependencies.targets) {
          if (!acceptingChanges) return;
          yield* Effect.acquireRelease(
            attempt("watch acquisition", () =>
              dependencies.watch(target, onChange),
            ),
            (watcher) => cleanup("watch cleanup", () => watcher.close()),
          );
        }
        yield* Effect.sync(() =>
          dependencies.log(dependencies.watchingMessage),
        );

        const build = Effect.gen(function* () {
          if (!acceptingChanges) return;
          yield* Effect.sync(() =>
            dependencies.log(
              "\nRust changed — rebuilding particle-engine.wasm",
            ),
          );
          const owned = yield* Effect.acquireRelease(
            attempt("build spawn", () => ({
              process: dependencies.spawn(),
              exited: false,
            })),
            (owned) =>
              owned.exited
                ? Effect.void
                : Effect.gen(function* () {
                    yield* cleanup("process cleanup", () =>
                      owned.process.kill(),
                    );
                    yield* Effect.tryPromise({
                      try: () => owned.process.exited,
                      catch: (cause) =>
                        new WatchWasmError({
                          operation: "process exit",
                          cause,
                        }),
                    }).pipe(Effect.catch(report));
                  }),
          );
          const exitCode = yield* Effect.tryPromise({
            try: () => owned.process.exited,
            catch: (cause) =>
              new WatchWasmError({ operation: "build wait", cause }),
          });
          owned.exited = true;
          if (exitCode !== 0) {
            yield* Effect.sync(() =>
              dependencies.error(
                `WASM build failed with exit code ${exitCode}`,
              ),
            );
          }
        }).pipe(Effect.scoped, Effect.catch(report));

        yield* Effect.all(
          [
            Stream.fromQueue(changes).pipe(
              Stream.debounce(120),
              Stream.runForEach(() => Queue.offer(pending, undefined)),
            ),
            Effect.gen(function* () {
              yield* build;
              while (true) {
                yield* Queue.take(pending);
                yield* build;
              }
            }),
          ],
          { concurrency: "unbounded" },
        );
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            acceptingChanges = false;
          }),
        ),
        Effect.scoped,
      );
      yield* Effect.raceFirst(run, Deferred.await(stopped));
    }),
  );
});
