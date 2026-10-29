import { describe, expect, test } from "bun:test";

import type { FileUIPart } from "ai";
import { Effect } from "effect";

import {
  convertPromptInputAttachments,
  createPromptInputAttachmentSubmission,
  type PromptInputAttachmentBrowser,
  type PromptInputAttachmentReader,
  readPromptInputAttachment,
} from "./prompt-input-attachments";

class AttachmentReader
  extends EventTarget
  implements PromptInputAttachmentReader
{
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState = 0;
  aborts = 0;
  reads = 0;
  listeners = new Set<() => void>();

  override addEventListener(type: string, listener: () => void) {
    this.listeners.add(listener);
    super.addEventListener(type, listener);
  }

  override removeEventListener(type: string, listener: () => void) {
    this.listeners.delete(listener);
    super.removeEventListener(type, listener);
  }

  readAsDataURL() {
    this.reads += 1;
    this.readyState = 1;
  }

  abort() {
    this.aborts += 1;
    this.readyState = 2;
    this.dispatchEvent(new Event("abort"));
  }

  succeed(result: string | ArrayBuffer | null = "data:text/plain;base64,b2s=") {
    this.result = result;
    this.readyState = 2;
    this.dispatchEvent(new Event("load"));
  }

  fail() {
    this.error = new DOMException("Read failed", "NotReadableError");
    this.readyState = 2;
    this.dispatchEvent(new Event("error"));
  }
}

const file = (url = "blob:attachment"): FileUIPart => ({
  type: "file",
  url,
  mediaType: "text/plain",
  filename: url,
});

const browserWith = (
  reader: AttachmentReader,
): PromptInputAttachmentBrowser => ({
  createFileReader: () => reader,
  fetch: async () => new Response("attachment"),
});

const waitFor = async (predicate: () => boolean) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await Bun.sleep(1);
  }
  throw new Error("Attachment operation did not reach the expected state.");
};

const readerAt = (readers: AttachmentReader[], index: number) => {
  const reader = readers[index];
  if (!reader) throw new Error(`Missing reader ${index}`);
  return reader;
};

describe("readPromptInputAttachment", () => {
  test("does not acquire a reader when already aborted", async () => {
    const reader = new AttachmentReader();
    const controller = new AbortController();
    controller.abort();
    const result = Effect.runPromise(
      readPromptInputAttachment(new Blob(), browserWith(reader)),
      {
        signal: controller.signal,
      },
    );
    await expect(result).rejects.toThrow();
    expect(reader.reads).toBe(0);
    expect(reader.listeners.size).toBe(0);
  });

  test("aborts an in-flight reader and removes every listener", async () => {
    const reader = new AttachmentReader();
    const controller = new AbortController();
    const result = Effect.runPromise(
      readPromptInputAttachment(new Blob(), browserWith(reader)),
      {
        signal: controller.signal,
      },
    );
    await waitFor(() => reader.reads === 1);
    controller.abort();
    await expect(result).rejects.toThrow();
    expect(reader.aborts).toBe(1);
    expect(reader.listeners.size).toBe(0);
    reader.succeed();
    expect(reader.aborts).toBe(1);
  });

  test("returns a data URL and detaches listeners on success", async () => {
    const reader = new AttachmentReader();
    const result = Effect.runPromise(
      readPromptInputAttachment(new Blob(), browserWith(reader)),
    );
    await waitFor(() => reader.reads === 1);
    reader.succeed();
    expect(await result).toBe("data:text/plain;base64,b2s=");
    expect(reader.listeners.size).toBe(0);
    expect(reader.aborts).toBe(0);
  });

  test.each(["error", "abort", "invalid"] as const)(
    "types %s failures and detaches listeners",
    async (failure) => {
      const reader = new AttachmentReader();
      const result = Effect.runPromise(
        Effect.flip(readPromptInputAttachment(new Blob(), browserWith(reader))),
      );
      await waitFor(() => reader.reads === 1);
      if (failure === "error") reader.fail();
      if (failure === "abort") reader.abort();
      if (failure === "invalid") reader.succeed(new ArrayBuffer(1));
      expect((await result)._tag).toBe("PromptInputAttachmentError");
      expect(reader.listeners.size).toBe(0);
    },
  );

  test("types factory and synchronous read exceptions", async () => {
    const reader = new AttachmentReader();
    reader.readAsDataURL = () => {
      throw new Error("Cannot start read");
    };
    const error = await Effect.runPromise(
      Effect.flip(readPromptInputAttachment(new Blob(), browserWith(reader))),
    );
    expect(error._tag).toBe("PromptInputAttachmentError");
    expect(reader.listeners.size).toBe(0);
    const factoryError = await Effect.runPromise(
      Effect.flip(
        readPromptInputAttachment(new Blob(), {
          ...browserWith(reader),
          createFileReader: () => {
            throw new Error("No reader");
          },
        }),
      ),
    );
    expect(factoryError._tag).toBe("PromptInputAttachmentError");
  });
});

describe("convertPromptInputAttachments", () => {
  test("does not fetch when already aborted", async () => {
    let fetches = 0;
    const controller = new AbortController();
    controller.abort();
    const result = Effect.runPromise(
      convertPromptInputAttachments([file()], {
        ...browserWith(new AttachmentReader()),
        fetch: async () => {
          fetches += 1;
          return new Response("attachment");
        },
      }),
      { signal: controller.signal },
    );
    await expect(result).rejects.toThrow();
    expect(fetches).toBe(0);
  });

  test.each(["response", "body"] as const)(
    "aborts fetch during %s and does not start a late read",
    async (phase) => {
      const reader = new AttachmentReader();
      const response = Promise.withResolvers<Response>();
      const body = Promise.withResolvers<Blob>();
      const requested = Promise.withResolvers<AbortSignal>();
      const controller = new AbortController();
      const result = Effect.runPromise(
        convertPromptInputAttachments([file()], {
          ...browserWith(reader),
          fetch: (_url, signal) => {
            requested.resolve(signal);
            if (phase === "response") return response.promise;
            const value = new Response("attachment");
            value.blob = () => body.promise;
            return Promise.resolve(value);
          },
        }),
        { signal: controller.signal },
      );
      const signal = await requested.promise;
      await Bun.sleep(0);
      controller.abort();
      await expect(result).rejects.toThrow();
      expect(signal.aborted).toBe(true);
      response.resolve(new Response("late"));
      body.resolve(new Blob(["late"]));
      await Bun.sleep(0);
      expect(reader.reads).toBe(0);
    },
  );

  test.each(["network", "http", "body"] as const)(
    "types %s failure without reading",
    async (phase) => {
      const reader = new AttachmentReader();
      const error = await Effect.runPromise(
        Effect.flip(
          convertPromptInputAttachments([file()], {
            ...browserWith(reader),
            fetch: async () => {
              if (phase === "network") throw new Error("Offline");
              const response = new Response("attachment", {
                status: phase === "http" ? 503 : 200,
              });
              if (phase === "body")
                response.blob = async () => {
                  throw new Error("Bad body");
                };
              return response;
            },
          }),
        ),
      );
      expect(error._tag).toBe("PromptInputAttachmentError");
      expect(reader.reads).toBe(0);
    },
  );

  test("bounds concurrency to three and preserves order, metadata and non-blob URLs", async () => {
    const readers: AttachmentReader[] = [];
    let fetches = 0;
    const files = [
      file("https://example.com/file"),
      ...Array.from({ length: 5 }, (_, index) => file(`blob:${index}`)),
      file("data:text/plain,existing"),
    ];
    const result = Effect.runPromise(
      convertPromptInputAttachments(files, {
        createFileReader: () => {
          const reader = new AttachmentReader();
          readers.push(reader);
          return reader;
        },
        fetch: async () => {
          fetches += 1;
          return new Response("attachment");
        },
      }),
    );
    await waitFor(() => readers.length === 3);
    expect(fetches).toBe(3);
    readerAt(readers, 2).succeed("data:text/plain,2");
    await waitFor(() => readers.length === 4);
    readerAt(readers, 3).succeed("data:text/plain,3");
    await waitFor(() => readers.length === 5);
    readerAt(readers, 4).succeed("data:text/plain,4");
    readerAt(readers, 1).succeed("data:text/plain,1");
    readerAt(readers, 0).succeed("data:text/plain,0");
    const converted = await result;
    expect(converted.map(({ url }) => url)).toEqual([
      "https://example.com/file",
      "data:text/plain,0",
      "data:text/plain,1",
      "data:text/plain,2",
      "data:text/plain,3",
      "data:text/plain,4",
      "data:text/plain,existing",
    ]);
    expect(converted.map(({ filename }) => filename)).toEqual(
      files.map(({ filename }) => filename),
    );
    expect(files[1]?.url).toBe("blob:0");
    expect(readers.every((reader) => reader.listeners.size === 0)).toBe(true);
  });

  test("a failed conversion interrupts sibling readers and queued conversions", async () => {
    const readers: AttachmentReader[] = [];
    const result = Effect.runPromise(
      Effect.flip(
        convertPromptInputAttachments(
          Array.from({ length: 5 }, () => file()),
          {
            createFileReader: () => {
              const reader = new AttachmentReader();
              readers.push(reader);
              return reader;
            },
            fetch: async () => new Response("attachment"),
          },
        ),
      ),
    );
    await waitFor(() => readers.length === 3);
    readerAt(readers, 0).fail();
    expect((await result)._tag).toBe("PromptInputAttachmentError");
    expect(readers).toHaveLength(3);
    expect(readerAt(readers, 1).aborts).toBe(1);
    expect(readerAt(readers, 2).aborts).toBe(1);
    expect(readers.every((reader) => reader.listeners.size === 0)).toBe(true);
  });
});

const submissionFixture = (files: FileUIPart[] = []) => {
  const state = { text: "original input", files };
  const controller = new AbortController();
  const errors: { code: string; message: string }[] = [];
  const sent: { text: string; files: FileUIPart[] }[] = [];
  const snapshot = { ...state };
  let clears = 0;
  const options = {
    message: snapshot,
    createController: () => controller,
    send: (message: typeof snapshot): void | Promise<void> => {
      sent.push(message);
    },
    isCurrent: () =>
      state.text === snapshot.text && state.files === snapshot.files,
    onSuccess: () => {
      clears += 1;
      state.text = "";
      state.files = [];
    },
    onError: (error: { code: string; message: string }) => {
      errors.push(error);
    },
  };
  return {
    state,
    snapshot,
    controller,
    errors,
    sent,
    options,
    clears: () => clears,
  };
};

describe("createPromptInputAttachmentSubmission", () => {
  test("never sends unresolved blob URLs and preserves input on conversion failure", async () => {
    const fixture = submissionFixture([file()]);
    const reader = new AttachmentReader();
    const submit = createPromptInputAttachmentSubmission(browserWith(reader));
    const result = submit(fixture.options);
    await waitFor(() => reader.reads === 1);
    reader.fail();
    await result;
    expect(fixture.sent).toHaveLength(0);
    expect(fixture.state).toEqual(fixture.snapshot);
    expect(fixture.clears()).toBe(0);
    expect(fixture.errors[0]?.code).toBe("attachment_conversion");
  });

  test.each(["throw", "reject"] as const)(
    "preserves input on send %s and permits retry",
    async (failure) => {
      const fixture = submissionFixture([file("data:text/plain,existing")]);
      const submit = createPromptInputAttachmentSubmission();
      await submit({
        ...fixture.options,
        send: () => {
          if (failure === "throw") throw new Error("Send failed");
          return Promise.reject(new Error("Send failed"));
        },
      });
      expect(fixture.state).toEqual(fixture.snapshot);
      expect(fixture.clears()).toBe(0);
      expect(fixture.errors[0]?.code).toBe("submit");
      await submit(fixture.options);
      expect(fixture.sent).toEqual([fixture.snapshot]);
      expect(fixture.clears()).toBe(1);
    },
  );

  test("retains original blob attachments after conversion succeeds but sending fails", async () => {
    const fixture = submissionFixture([file()]);
    const reader = new AttachmentReader();
    const submit = createPromptInputAttachmentSubmission(browserWith(reader));
    const result = submit({
      ...fixture.options,
      send: async (message) => {
        fixture.sent.push(message);
        throw new Error("Send failed");
      },
    });
    await waitFor(() => reader.reads === 1);
    reader.succeed();
    await result;
    expect(fixture.sent[0]?.files[0]?.url.startsWith("data:")).toBe(true);
    expect(fixture.state.files[0]?.url).toBe("blob:attachment");
    expect(fixture.state).toEqual(fixture.snapshot);
    expect(fixture.clears()).toBe(0);
    expect(fixture.errors[0]?.code).toBe("submit");
  });

  test("suppresses duplicate submission during conversion and send, then clears on success", async () => {
    const fixture = submissionFixture([file()]);
    const reader = new AttachmentReader();
    const submit = createPromptInputAttachmentSubmission(browserWith(reader));
    const send = Promise.withResolvers<undefined>();
    const options = {
      ...fixture.options,
      send: (message: typeof fixture.snapshot) => {
        fixture.sent.push(message);
        return send.promise;
      },
    };
    const first = submit(options);
    await submit(options);
    await waitFor(() => reader.reads === 1);
    reader.succeed();
    await waitFor(() => fixture.sent.length === 1);
    await submit(options);
    expect(fixture.sent).toHaveLength(1);
    expect(fixture.state).toEqual(fixture.snapshot);
    expect(fixture.sent[0]?.files[0]?.url.startsWith("data:")).toBe(true);
    send.resolve(undefined);
    await first;
    expect(fixture.state).toEqual({ text: "", files: [] });
    expect(fixture.clears()).toBe(1);
  });

  test.each(["programmatic text", "attachments", "provider revision"] as const)(
    "dispatches changed %s while the previous send is pending and ignores its late completion",
    async (change) => {
      const state: { text: string; files: FileUIPart[]; revision: number } = {
        text: "message A",
        files: [],
        revision: 0,
      };
      const sent: { text: string; files: FileUIPart[] }[] = [];
      const errors: string[] = [];
      const cleared: string[] = [];
      const controllers: AbortController[] = [];
      const createController = () => {
        controllers.at(-1)?.abort();
        const controller = new AbortController();
        controllers.push(controller);
        return controller;
      };
      const captureSubmission = (send: Promise<undefined>) => {
        const { text, files, revision } = state;
        return {
          message: { text, files },
          createController,
          send: (message: { text: string; files: FileUIPart[] }) => {
            sent.push(message);
            return send;
          },
          isCurrent: () =>
            state.text === text &&
            state.files === files &&
            state.revision === revision,
          onSuccess: () => {
            cleared.push(text);
          },
          onError: (error: { message: string }) => {
            errors.push(error.message);
          },
        };
      };
      const firstSend = Promise.withResolvers<undefined>();
      const secondSend = Promise.withResolvers<undefined>();
      const submit = createPromptInputAttachmentSubmission();
      const first = captureSubmission(firstSend.promise);
      const firstOperation = submit(first);
      await waitFor(() => sent.length === 1);
      await submit(captureSubmission(firstSend.promise));
      expect(sent).toHaveLength(1);
      expect(controllers).toHaveLength(1);

      if (change === "programmatic text") state.text = "message B";
      if (change === "attachments") state.files = [file("data:text/plain,B")];
      if (change === "provider revision") state.revision += 1;
      const second = captureSubmission(secondSend.promise);
      const secondOperation = submit(second);
      await waitFor(() => sent.length === 2);
      expect(sent).toEqual([first.message, second.message]);
      expect(controllers).toHaveLength(2);
      expect(controllers[0]?.signal.aborted).toBe(true);
      expect(controllers[1]?.signal.aborted).toBe(false);
      await firstOperation;
      expect(cleared).toEqual([]);

      firstSend.resolve(undefined);
      await Bun.sleep(0);
      await submit(captureSubmission(secondSend.promise));
      expect(sent).toHaveLength(2);
      expect(controllers).toHaveLength(2);
      expect(controllers[1]?.signal.aborted).toBe(false);
      expect(cleared).toEqual([]);
      expect(state.text).toBe(second.message.text);
      expect(state.files).toBe(second.message.files);

      state.text = "new unsent message C";
      secondSend.resolve(undefined);
      await secondOperation;
      expect(state.text).toBe("new unsent message C");
      expect(cleared).toEqual([]);
      expect(errors).toEqual([]);
    },
  );

  test.each(["text", "files"] as const)(
    "does not clear newer %s after send completes",
    async (change) => {
      const fixture = submissionFixture();
      const send = Promise.withResolvers<undefined>();
      const submit = createPromptInputAttachmentSubmission();
      let sending = false;
      const result = submit({
        ...fixture.options,
        send: () => {
          sending = true;
          return send.promise;
        },
      });
      await waitFor(() => sending);
      if (change === "text") fixture.state.text = "new input";
      if (change === "files") fixture.state.files = [file("blob:new")];
      send.resolve(undefined);
      await result;
      expect(fixture.clears()).toBe(0);
      expect(fixture.state.text).toBe(
        change === "text" ? "new input" : "original input",
      );
      expect(fixture.state.files).toEqual(
        change === "files" ? [file("blob:new")] : [],
      );
    },
  );

  test("unmount cancellation aborts reading without sending, clearing or reporting an error", async () => {
    const fixture = submissionFixture([file()]);
    const reader = new AttachmentReader();
    const submit = createPromptInputAttachmentSubmission(browserWith(reader));
    const result = submit(fixture.options);
    await waitFor(() => reader.reads === 1);
    fixture.controller.abort();
    await result;
    expect(reader.aborts).toBe(1);
    expect(fixture.sent).toHaveLength(0);
    expect(fixture.errors).toHaveLength(0);
    expect(fixture.clears()).toBe(0);
  });

  test("restart ignores a late send completion and retains the new operation's lock", async () => {
    const first = submissionFixture();
    const second = submissionFixture();
    const firstSend = Promise.withResolvers<undefined>();
    const secondSend = Promise.withResolvers<undefined>();
    const submit = createPromptInputAttachmentSubmission();
    let sending = false;
    const oldOperation = submit({
      ...first.options,
      send: () => {
        sending = true;
        return firstSend.promise;
      },
    });
    await waitFor(() => sending);
    first.controller.abort();
    const newOperation = submit({
      ...second.options,
      send: (message) => {
        second.sent.push(message);
        return secondSend.promise;
      },
    });
    await oldOperation;
    firstSend.resolve(undefined);
    await Bun.sleep(0);
    await submit(second.options);
    expect(first.clears()).toBe(0);
    expect(first.errors).toHaveLength(0);
    expect(second.sent).toHaveLength(1);
    expect(second.clears()).toBe(0);
    secondSend.resolve(undefined);
    await newOperation;
    expect(second.clears()).toBe(1);
  });
});
