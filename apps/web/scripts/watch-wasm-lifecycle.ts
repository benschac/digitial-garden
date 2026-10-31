import { Deferred, Effect, Queue, Schema, Stream } from "effect";

export type WatchWasmSignal = "SIGINT" | "SIGTERM";

export interface WatchWasmProcess {
  readonly exited: Promise<number>;
  kill: () => void;
}

export interface WatchWasmDependencies {
  readonly targets: readonly { path: string; recursive: boolean }[];
  watch: (
    target: { path: string; recursive: boolean },
    onChange: () => void
  ) => { close: () => void };
  spawn: () => WatchWasmProcess;
  onSignal: (signal: WatchWasmSignal, listener: () => void) => void;
  offSignal: (signal: WatchWasmSignal, listener: () => void) => void;
  log: (message: string) => void;
  error: (message: string) => void;
  readonly watchingMessage: string;
}

export class WatchWasmError extends Schema.TaggedError<WatchWasmError>()(
  "WatchWasmError",
  { cause: Schema.Defect(), operation: Schema.String }
) {}

const attempt = <A>(operation: string, action: () => A) =>
  Effect.try({
    catch: (cause) => new WatchWasmError({ cause, operation }),
    try: action,
  });

export const watchWasm = Effect.fn("watchWasm")(function* watchWasmProgram(
  dependencies: WatchWasmDependencies
) {
  const report = (error: WatchWasmError) =>
    Effect.sync(() =>
      dependencies.error(
        `WASM ${error.operation} failed: ${String(error.cause)}`
      )
    );

  const cleanup = (operation: string, action: () => void) =>
    attempt(operation, action).pipe(Effect.catch(report));

  yield* Effect.scoped(
    Effect.gen(function* ownWasmWatchers() {
      const stopped = yield* Deferred.make<undefined>();
      let acceptingChanges = true;

      const stop = () => {
        acceptingChanges = false;
        Deferred.doneUnsafe(stopped, Effect.succeed(undefined));
      };

      for (const signal of ["SIGINT", "SIGTERM"] as const) {
        yield* Effect.acquireRelease(
          attempt("signal registration", () =>
            dependencies.onSignal(signal, stop)
          ),
          () =>
            cleanup("signal removal", () =>
              dependencies.offSignal(signal, stop)
            )
        );
      }

      const run = Effect.gen(function* run() {
        const changes = yield* Effect.acquireRelease(
          Queue.sliding<undefined>(1),
          Queue.shutdown
        );

        const pending = yield* Effect.acquireRelease(
          Queue.dropping<undefined>(1),
          Queue.shutdown
        );

        const onChange = () => {
          if (acceptingChanges) {
            Queue.offerUnsafe(changes, undefined);
          }
        };

        for (const target of dependencies.targets) {
          if (!acceptingChanges) {
            return;
          }

          yield* Effect.acquireRelease(
            attempt("watch acquisition", () =>
              dependencies.watch(target, onChange)
            ),
            (watcher) => cleanup("watch cleanup", () => watcher.close())
          );
        }

        yield* Effect.sync(() =>
          dependencies.log(dependencies.watchingMessage)
        );

        const build = Effect.gen(function* build() {
          if (!acceptingChanges) {
            return;
          }

          yield* Effect.sync(() =>
            dependencies.log("\nRust changed — rebuilding particle-engine.wasm")
          );

          const owned = yield* Effect.acquireRelease(
            attempt("build spawn", () => ({
              exited: false,
              process: dependencies.spawn(),
            })),
            (acquired) =>
              acquired.exited
                ? Effect.void
                : Effect.gen(function* releaseWasmProcess() {
                    yield* cleanup("process cleanup", () =>
                      acquired.process.kill()
                    );
                    yield* Effect.tryPromise({
                      catch: (cause) =>
                        new WatchWasmError({
                          cause,
                          operation: "process exit",
                        }),
                      try: () => acquired.process.exited,
                    }).pipe(Effect.catch(report));
                  })
          );

          const exitCode = yield* Effect.tryPromise({
            catch: (cause) =>
              new WatchWasmError({ cause, operation: "build wait" }),
            try: () => owned.process.exited,
          });

          owned.exited = true;

          if (exitCode !== 0) {
            yield* Effect.sync(() =>
              dependencies.error(`WASM build failed with exit code ${exitCode}`)
            );
          }
        }).pipe(Effect.scoped, Effect.catch(report));

        yield* Effect.all(
          [
            Stream.fromQueue(changes).pipe(
              Stream.debounce(120),
              Stream.runForEach(() => Queue.offer(pending, undefined))
            ),
            Effect.gen(function* runBuildQueue() {
              yield* build;

              while (true) {
                yield* Queue.take(pending);
                yield* build;
              }
            }),
          ],
          { concurrency: "unbounded" }
        );
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            acceptingChanges = false;
          })
        ),
        Effect.scoped
      );

      yield* Effect.raceFirst(run, Deferred.await(stopped));
    })
  );
});
