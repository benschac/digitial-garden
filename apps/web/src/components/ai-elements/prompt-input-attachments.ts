import type { FileUIPart } from "ai";
import { Predicate, Effect, Schema } from "effect";

export class PromptInputAttachmentError extends Schema.TaggedError<PromptInputAttachmentError>()(
  "PromptInputAttachmentError",
  { cause: Schema.Defect(), message: Schema.String }
) {}

export class PromptInputSendError extends Schema.TaggedError<PromptInputSendError>()(
  "PromptInputSendError",
  { cause: Schema.Defect(), message: Schema.String }
) {}

export interface PromptInputAttachmentReader {
  readonly result: string | ArrayBuffer | null;
  readonly error: DOMException | null;
  readonly readyState: number;
  addEventListener: (
    type: "load" | "error" | "abort",
    listener: () => void
  ) => void;
  removeEventListener: (
    type: "load" | "error" | "abort",
    listener: () => void
  ) => void;
  readAsDataURL: (blob: Blob) => void;
  abort: () => void;
}

export interface PromptInputAttachmentBrowser {
  createFileReader: () => PromptInputAttachmentReader;
  fetch: (url: string, signal: AbortSignal) => Promise<Response>;
}

const browser: PromptInputAttachmentBrowser = {
  createFileReader: () => new FileReader(),
  fetch: (url, signal) => fetch(url, { signal }),
};

export const readPromptInputAttachment = (
  blob: Blob,
  boundaries: PromptInputAttachmentBrowser = browser
) =>
  Effect.andThen(
    Effect.yieldNow,
    Effect.callback<string, PromptInputAttachmentError>((resume) => {
      let reader: PromptInputAttachmentReader;

      try {
        reader = boundaries.createFileReader();
      } catch (error) {
        resume(
          Effect.fail(
            new PromptInputAttachmentError({
              cause: error,
              message: "Unable to open the attachment reader.",
            })
          )
        );

        return;
      }

      const listeners = new Map<"load" | "error" | "abort", () => void>();

      const detach = () => {
        for (const [type, listener] of listeners) {
          reader.removeEventListener(type, listener);
        }
      };

      const fail = (cause: PromptInputAttachmentError["cause"]) => {
        detach();

        if (reader.readyState === 1) {
          reader.abort();
        }

        resume(
          Effect.fail(
            new PromptInputAttachmentError({
              cause,
              message: "Unable to read the attachment.",
            })
          )
        );
      };

      const onLoad = () => {
        const { result } = reader;

        if (!Predicate.isString(result) || !result.startsWith("data:")) {
          fail(new Error("The attachment reader did not return a data URL."));

          return;
        }

        detach();
        resume(Effect.succeed(result));
      };

      const onError = () => {
        fail(reader.error);
      };

      const onAbort = () => {
        fail(new DOMException("Attachment read aborted.", "AbortError"));
      };

      listeners.set("load", onLoad);
      listeners.set("error", onError);
      listeners.set("abort", onAbort);

      for (const [type, listener] of listeners) {
        reader.addEventListener(type, listener);
      }

      try {
        reader.readAsDataURL(blob);
      } catch (error) {
        fail(error);
      }

      return Effect.sync(() => {
        detach();

        if (reader.readyState === 1) {
          reader.abort();
        }
      });
    })
  );

const convertPromptInputAttachment = Effect.fnUntraced(
  function* convertPromptInputAttachment(
    file: FileUIPart,
    boundaries: PromptInputAttachmentBrowser
  ) {
    if (!file.url.startsWith("blob:")) {
      return file;
    }

    const blob = yield* Effect.tryPromise({
      catch: (cause) =>
        new PromptInputAttachmentError({
          cause,
          message: "Unable to load the attachment.",
        }),
      try: async (signal) => {
        const response = await boundaries.fetch(file.url, signal);
        signal.throwIfAborted();

        if (!response.ok) {
          throw new Error(`Attachment request failed (${response.status}).`);
        }

        const responseBlob = await response.blob();
        signal.throwIfAborted();

        return responseBlob;
      },
    });

    const url = yield* readPromptInputAttachment(blob, boundaries);

    return { ...file, url };
  }
);

export const convertPromptInputAttachments = (
  files: readonly FileUIPart[],
  boundaries: PromptInputAttachmentBrowser = browser
) =>
  Effect.andThen(
    Effect.yieldNow,
    Effect.forEach(
      files,
      (file) => convertPromptInputAttachment(file, boundaries),
      {
        concurrency: 3,
      }
    )
  );

export type PromptInputSubmissionOutcome =
  | { readonly status: "accepted" }
  | { readonly status: "cancelled" }
  | { readonly status: "unconfirmed"; readonly message: string };

export interface PromptInputSubmissionContext {
  readonly signal: AbortSignal;
}

export type PromptInputSubmissionHandler<
  Arguments extends readonly unknown[],
> =
  | ((...args: Arguments) => void)
  | ((...args: Arguments) => Promise<void>)
  | ((...args: Arguments) => PromptInputSubmissionOutcome)
  | ((...args: Arguments) => Promise<PromptInputSubmissionOutcome>);

interface PromptInputAttachmentSubmission {
  message: { text: string; files: FileUIPart[] };
  createController: () => AbortController;
  send: PromptInputSubmissionHandler<
    [
      message: {
        text: string;
        files: FileUIPart[];
      },
      context: PromptInputSubmissionContext,
    ]
  >;
  isCurrent: () => boolean;
  onSuccess: () => void;
  onError: (error: {
    code: "attachment_conversion" | "submit";
    message: string;
  }) => void;
}

export const createPromptInputAttachmentSubmission = (
  boundaries: PromptInputAttachmentBrowser = browser
) => {
  let active: { signal: AbortSignal; isCurrent: () => boolean } | undefined;

  return async (submission: PromptInputAttachmentSubmission) => {
    if (active && !active.signal.aborted && active.isCurrent()) {
      return;
    }

    const { signal } = submission.createController();
    const operation = { isCurrent: submission.isCurrent, signal };
    active = operation;
    const isActive = () => active === operation && !signal.aborted;

    const workflow = Effect.gen(function* workflow() {
      const files = yield* convertPromptInputAttachments(
        submission.message.files,
        boundaries
      );

      const outcome = yield* Effect.tryPromise({
        catch: (cause) =>
          new PromptInputSendError({
            cause,
            message: "Unable to send the message.",
          }),
        try: async () => {
          signal.throwIfAborted();

          return await submission.send(
            { files, text: submission.message.text },
            { signal }
          );
        },
      });

      if (outcome?.status === "unconfirmed") {
        return yield* new PromptInputSendError({
          cause: outcome,
          message: outcome.message,
        });
      }

      return outcome?.status !== "cancelled";
    }).pipe(
      Effect.match({
        onFailure: (error) => ({
          accepted: false,
          error: {
            code: Predicate.isTagged(error, "PromptInputAttachmentError")
              ? ("attachment_conversion" as const)
              : ("submit" as const),
            message: error.message,
          },
        }),
        onSuccess: (accepted) => ({ accepted, error: undefined }),
      })
    );

    try {
      const result = await Effect.runPromise(workflow, { signal });

      if (!isActive()) {
        return;
      }

      if (result.error) {
        submission.onError(result.error);
      } else if (result.accepted && submission.isCurrent()) {
        submission.onSuccess();
      }
    } catch (error) {
      if (!signal.aborted) {
        throw error;
      }
    } finally {
      if (active === operation) {
        active = undefined;
      }
    }
  };
};
