import path from "node:path";

import { Effect, Schema } from "effect";

export const previewDimensions = {
  fps: 30,
  height: 630,
  seconds: 8,
  width: 1200,
};

export interface PreviewProcess {
  readonly exited: Promise<{
    code: number | null;
    signal: string | null;
    error?: Error;
  }>;
  stop: () => Promise<void>;
}

export interface PreviewCommandParameters {
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  mobile?: boolean;
  expression?: string;
  awaitPromise?: boolean;
  returnByValue?: boolean;
  format?: string;
}

export const previewCommandResultSchema = Schema.Struct({
  data: Schema.optionalKey(Schema.String),
  result: Schema.optionalKey(
    Schema.Struct({ value: Schema.optionalKey(Schema.Unknown) })
  ),
});

type PreviewCommandResult = typeof previewCommandResultSchema.Type;

export interface PreviewConnection {
  ready: (signal: AbortSignal) => Promise<void>;
  command: (
    method: string,
    params: PreviewCommandParameters,
    signal: AbortSignal
  ) => Promise<PreviewCommandResult>;
  close: () => void;
}

export interface PreviewDependencies {
  temporary: () => Promise<string>;
  remove: (path: string) => Promise<void>;
  font: () => Promise<Buffer>;
  html: (font: Buffer) => string;
  browser: (temporary: string) => PreviewProcess;
  target: (temporary: string, signal: AbortSignal) => Promise<string>;
  connect: (url: string) => PreviewConnection;
  mkdir: () => Promise<void>;
  write: (path: string, data: Buffer) => Promise<void>;
  encoder: (args: string[]) => PreviewProcess;
  output: string;
}

const { TaggedError: taggedError } = Schema;

export class PreviewError extends taggedError<PreviewError>()("PreviewError", {
  cause: Schema.Defect(),
  stage: Schema.String,
}) {
  override get message() {
    return `Social preview ${this.stage} failed: ${String(this.cause)}`;
  }
}

const screenshotSchema = Schema.Struct({ data: Schema.String });

const documentSchema = Schema.Struct({
  result: Schema.Struct({ value: Schema.Literal(true) }),
});

const attempt = <A>(
  stage: string,
  action: (signal: AbortSignal) => Promise<A>
) =>
  Effect.tryPromise({
    catch: (cause) => new PreviewError({ cause, stage }),
    try: action,
  });

const sync = <A>(stage: string, action: () => A) =>
  Effect.try({
    catch: (cause) => new PreviewError({ cause, stage }),
    try: action,
  });

const release = (stage: string, action: () => Promise<void>) =>
  attempt(stage, action).pipe(Effect.orDie);

const ownProcess = (stage: string, start: () => PreviewProcess) =>
  Effect.acquireRelease(sync(stage, start), (child) =>
    release(`${stage} cleanup`, () => child.stop())
  );

export const renderSocialPreview = Effect.fn("renderSocialPreview")(
  function* renderSocialPreview(dependencies: PreviewDependencies) {
    const { width, height, fps, seconds } = previewDimensions;

    yield* Effect.scoped(
      Effect.gen(function* exportResources() {
        const temporary = yield* Effect.acquireRelease(
          attempt("temporary directory", () => dependencies.temporary()),
          (temporaryPath) =>
            release("temporary cleanup", () =>
              dependencies.remove(temporaryPath)
            )
        );

        const font = yield* attempt("font", () => dependencies.font());
        const html = yield* sync("document", () => dependencies.html(font));

        const browser = yield* ownProcess("browser", () =>
          dependencies.browser(temporary)
        );

        const browserExit = attempt("browser exit", async () => {
          const exit = await browser.exited;
          throw (
            exit.error ??
            new Error(`Chromium exited (${exit.code ?? exit.signal}).`)
          );
        });

        const capture = Effect.gen(function* capture() {
          const url = yield* attempt("debugging target", (signal) =>
            dependencies.target(temporary, signal)
          );

          const connection = yield* Effect.acquireRelease(
            sync("socket", () => dependencies.connect(url)),
            (socket) =>
              sync("socket cleanup", () => socket.close()).pipe(Effect.orDie)
          );

          yield* attempt("socket open", (signal) => connection.ready(signal));

          const command = (
            method: string,
            params: PreviewCommandParameters = {}
          ) =>
            attempt(method, (signal) =>
              connection.command(method, params, signal)
            );

          yield* command("Emulation.setDeviceMetricsOverride", {
            deviceScaleFactor: 1,
            height,
            mobile: false,
            width,
          });

          const document = yield* command("Runtime.evaluate", {
            awaitPromise: true,
            expression: `document.open(); document.write(${JSON.stringify(html)}); document.close(); document.fonts.ready.then(() => document.querySelectorAll('[data-avatar-part^="eye-"]').length === 2 && document.fonts.check('700 120px Bonbance'))`,
            returnByValue: true,
          });

          yield* sync("document readiness", () =>
            Schema.decodeUnknownSync(documentSchema)(document)
          );
          yield* attempt("output directory", () => dependencies.mkdir()).pipe(
            Effect.uninterruptible
          );

          for (let frame = 0; frame < fps * seconds; frame += 1) {
            yield* command("Runtime.evaluate", {
              expression: `document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = ${(frame * 1000) / fps}; })`,
            });

            const result = yield* command("Page.captureScreenshot", {
              format: "png",
            });

            const screenshot = yield* sync("screenshot", () =>
              Schema.decodeUnknownSync(screenshotSchema)(result)
            );

            yield* attempt("frame write", () =>
              dependencies.write(
                path.join(temporary, `${String(frame).padStart(4, "0")}.png`),
                Buffer.from(screenshot.data, "base64")
              )
            ).pipe(Effect.uninterruptible);
          }
        }).pipe(Effect.scoped);

        yield* Effect.raceFirst(capture, browserExit);

        for (const args of [
          [
            "-framerate",
            String(fps),
            "-i",
            path.join(temporary, "%04d.png"),
            "-an",
            "-c:v",
            "libx264",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            path.join(dependencies.output, "home.mp4"),
          ],
          [
            "-i",
            path.join(temporary, "0000.png"),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            path.join(dependencies.output, "home.jpg"),
          ],
        ]) {
          yield* Effect.scoped(
            Effect.gen(function* encodePreview() {
              const encoder = yield* ownProcess("encoder", () =>
                dependencies.encoder(args)
              );

              const exit = yield* attempt("encoder exit", () => encoder.exited);

              if (exit.error || exit.code !== 0) {
                return yield* new PreviewError({
                  cause:
                    exit.error ??
                    new Error(`FFmpeg exited (${exit.code ?? exit.signal}).`),
                  stage: "encoder exit",
                });
              }
            })
          );
        }
      })
    );
  }
);
