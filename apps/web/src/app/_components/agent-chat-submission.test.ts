import { afterEach, describe, expect, spyOn, test } from "bun:test";

import type { FileUIPart } from "ai";
import { Client } from "eve/client";
import type { MessageStreamEvent } from "eve/client";

import { createPromptInputAttachmentSubmission } from "@/components/ai-elements/prompt-input-attachments";

import { createAgentChatSubmission } from "./agent-chat-submission";

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0).toReversed()) {
    cleanup();
  }
});

const waitFor = (predicate: () => boolean, attempts = 100): Promise<void> => {
  if (predicate()) {
    return Promise.resolve();
  }

  if (attempts === 0) {
    return Promise.reject(
      new Error("Expected local Eve operation did not finish.")
    );
  }

  return Bun.sleep(1).then(() => waitFor(predicate, attempts - 1));
};

const transport = (initialEvents: MessageStreamEvent[] = []) => {
  const posts: {
    readonly init: RequestInit;
    readonly response: ReturnType<typeof Promise.withResolvers<Response>>;
  }[] = [];

  const streams: ReadableStreamDefaultController<Uint8Array>[] = [];

  const fetch = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      (...args: Parameters<typeof globalThis.fetch>) => {
        const [input, init] = args;
        const url = input instanceof Request ? input.url : String(input);

        if (url.includes("/stream")) {
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              streams.push(controller);

              for (const event of initialEvents) {
                controller.enqueue(
                  new TextEncoder().encode(`${JSON.stringify(event)}\n`)
                );
              }

              init?.signal?.addEventListener(
                "abort",
                () => controller.error(init.signal?.reason),
                { once: true }
              );
            },
          });

          return Promise.resolve(
            new Response(body, {
              headers: {
                "x-eve-stream-tail-index": String(initialEvents.length - 1),
                "x-eve-stream-version": "26",
              },
            })
          );
        }

        if (init?.method !== "POST") {
          throw new Error(`Unexpected local request: ${url}`);
        }

        const response = Promise.withResolvers<Response>();
        posts.push({ init, response });

        return response.promise;
      },
      { preconnect: globalThis.fetch.preconnect }
    )
  );

  cleanups.push(() => fetch.mockRestore());

  const postAt = (index: number) => {
    const post = posts[index];

    if (!post) {
      throw new Error(`Missing local request ${index}`);
    }

    return post;
  };

  return {
    accept: (index: number, deliveryId = `delivery-${index}`) =>
      postAt(index).response.resolve(
        Response.json({ deliveryId, sessionId: "local-session" })
      ),
    fail: (index: number) =>
      postAt(index).response.reject(new Error("controlled transport failure")),
    posts,
    push: (...events: MessageStreamEvent[]) => {
      const bytes = new TextEncoder().encode(
        `${events.map((event) => JSON.stringify(event)).join("\n")}\n`
      );

      for (const stream of streams) {
        stream.enqueue(bytes);
      }
    },
    streams,
  };
};

const createSubmission = (
  options: Parameters<typeof createAgentChatSubmission>[0] = {}
) => {
  const submission = createAgentChatSubmission(options);
  cleanups.push(() => submission.store.reset());

  return submission;
};

const draft = (
  submission: ReturnType<typeof createAgentChatSubmission>,
  text = "original input"
) => {
  const state = {
    files: [
      {
        filename: "evidence.txt",
        mediaType: "text/plain",
        type: "file",
        url: "data:text/plain,evidence",
      },
    ] satisfies FileUIPart[],
    text,
  };

  const snapshot = { ...state };
  const errors: string[] = [];
  let clears = 0;
  const controller = new AbortController();
  const submit = createPromptInputAttachmentSubmission();

  const run = (turnPolicy?: "steer") =>
    submit({
      createController: () => controller,
      isCurrent: () =>
        state.text === snapshot.text && state.files === snapshot.files,
      message: snapshot,
      onError: (error) => errors.push(error.message),
      onSuccess: () => {
        clears += 1;
        state.text = "";
        state.files = [];
      },
      send: (message, context) =>
        submission.send(message.text, { ...context, turnPolicy }),
    });

  return { clears: () => clears, controller, errors, run, snapshot, state };
};

const received = (deliveryId = "delivery-0"): MessageStreamEvent => ({
  data: { message: "original input", sequence: 1, turnId: "turn-1" },
  meta: {
    at: "2026-10-31T00:00:00.000Z",
    deliveryIds: [deliveryId],
    id: `received-${deliveryId}`,
  },
  type: "message.received",
});

describe("agent chat submission acceptance", () => {
  test("retains text and attachments when actual Eve send resolves after sessions.create throws", async () => {
    const client = new Client({ host: "" });
    client.sessions.create = () => {
      throw new Error("controlled transport failure");
    };

    const submission = createSubmission({ client });
    const fixture = draft(submission);
    await fixture.run();
    await waitFor(() => submission.store.snapshot.status === "error");
    expect(submission.store.snapshot.data).toBe(
      submission.store.snapshot.conversation
    );
    expect(fixture.state).toEqual(fixture.snapshot);
    expect(fixture.clears()).toBe(0);
    expect(fixture.errors).toEqual(["controlled transport failure"]);
  });

  test.each([false, true])(
    "clears accepted initial/existing-session=%s submission before stream completion",
    async (existing) => {
      const local = transport();

      const submission = createSubmission(
        existing
          ? { initialSession: { sessionId: "local-session", streamIndex: 0 } }
          : {}
      );

      const fixture = draft(submission);
      const operation = fixture.run();
      await waitFor(() => local.posts.length === 1);
      local.accept(0);
      await operation;
      expect(fixture.clears()).toBe(1);
      expect(fixture.errors).toEqual([]);
      expect(submission.store.snapshot.status).toBe("submitted");
      await waitFor(() => local.streams.length === 1);
      local.push(received());
      await waitFor(() => submission.store.snapshot.events.length === 1);
      expect(
        submission.store.snapshot.data.messages.some(
          (message) => message.metadata?.optimistic
        )
      ).toBe(false);
    }
  );

  test("an accepted message followed by a stream failure remains accepted", async () => {
    const local = transport();
    const submission = createSubmission();
    const fixture = draft(submission);
    const operation = fixture.run();
    await waitFor(() => local.posts.length === 1);
    local.accept(0);
    await operation;
    await waitFor(() => local.streams.length === 1);
    local.push(received(), {
      data: {
        code: "CONTROLLED",
        message: "later stream failure",
        sessionId: "local-session",
      },
      meta: { at: "2026-10-31T00:00:01.000Z", id: "failure" },
      type: "session.failed",
    });
    await waitFor(() => submission.store.snapshot.status === "error");
    expect(fixture.clears()).toBe(1);
    expect(fixture.errors).toEqual([]);
    expect(submission.store.snapshot.error?.message).toContain(
      "later stream failure"
    );
  });

  test.each(["text", "files"] as const)(
    "accepted submission does not clear a modified %s draft",
    async (change) => {
      const local = transport();
      const submission = createSubmission();
      const fixture = draft(submission);
      const operation = fixture.run();
      await waitFor(() => local.posts.length === 1);

      if (change === "text") {
        fixture.state.text = "new unsent text";
      }

      if (change === "files") {
        fixture.state.files = [];
      }

      local.accept(0);
      await operation;
      expect(fixture.clears()).toBe(0);
      expect(fixture.state.text).toBe(
        change === "text" ? "new unsent text" : fixture.snapshot.text
      );
    }
  );

  test.each([false, true])(
    "cancellation before dispatch=%s retains the draft and ignores late acceptance",
    async (beforeDispatch) => {
      const local = transport();
      const submission = createSubmission();
      const fixture = draft(submission);

      if (beforeDispatch) {
        fixture.controller.abort();
      }

      const operation = fixture.run();

      if (!beforeDispatch) {
        await waitFor(() => local.posts.length === 1);
        fixture.controller.abort();
      }

      await operation;

      if (!beforeDispatch) {
        local.accept(0);
        await Bun.sleep(0);
      }

      expect(fixture.state).toEqual(fixture.snapshot);
      expect(fixture.clears()).toBe(0);
      expect(fixture.errors).toEqual([]);
      expect(local.posts).toHaveLength(beforeDispatch ? 0 : 1);
    }
  );

  test("overlapping steering requests keep operation identity when replies arrive out of order", async () => {
    const local = transport();
    const submission = createSubmission();
    const first = submission.send("first");
    await waitFor(() => local.posts.length === 1);
    local.accept(0);
    expect(await first).toEqual({ status: "accepted" });

    const second = submission.send("same text", {
      headers: { "x-existing": "retained" },
      turnPolicy: "steer",
    });

    const third = submission.send("same text", {
      headers: { "x-existing": "retained" },
      turnPolicy: "steer",
    });

    await waitFor(() => local.posts.length === 3);
    expect(local.posts[1]?.init.body).toContain('"turnPolicy":"steer"');
    expect([...new Headers(local.posts[1]?.init.headers)]).toEqual([
      ["content-type", "application/json"],
      ["x-existing", "retained"],
    ]);
    local.accept(2);
    expect(await third).toEqual({ status: "accepted" });
    local.fail(1);
    expect(await second).toEqual({
      message: "controlled transport failure",
      status: "unconfirmed",
    });
  });

  test("a rejected steering request preserves the current composer", async () => {
    const local = transport();
    const submission = createSubmission();
    const first = submission.send("first");
    await waitFor(() => local.posts.length === 1);
    local.accept(0);
    await first;
    const fixture = draft(submission, "steering draft");
    const operation = fixture.run("steer");
    await waitFor(() => local.posts.length === 2);
    local.fail(1);
    await operation;
    expect(fixture.state).toEqual(fixture.snapshot);
    expect(fixture.errors).toEqual(["controlled transport failure"]);
    expect(fixture.clears()).toBe(0);
  });

  test("resolved send without an observed dispatch is unconfirmed", async () => {
    const submission = createSubmission();
    const send = spyOn(submission.store, "send").mockResolvedValue(undefined);
    cleanups.push(() => send.mockRestore());
    const outcome = await submission.send("draft");
    expect(outcome.status).toBe("unconfirmed");
  });

  test("synchronous preflight rejection settles without a transport request", async () => {
    const local = transport();
    const submission = createSubmission();
    submission.store.setCallbacks({
      prepareSend: () => {
        throw new Error("preflight failed");
      },
    });
    const outcome = await submission.send("draft");
    expect(outcome.status).toBe("unconfirmed");
    expect(local.posts).toHaveLength(0);
    expect(submission.store.snapshot.error?.message).toBe("preflight failed");
  });

  test("starting another composer operation does not abort an accepted Eve turn", async () => {
    const local = transport();
    const submission = createSubmission();
    const controller = new AbortController();
    const first = submission.send("first", { signal: controller.signal });
    await waitFor(() => local.posts.length === 1);
    local.accept(0);
    expect(await first).toEqual({ status: "accepted" });
    controller.abort();
    expect(local.posts[0]?.init.signal?.aborted).toBe(false);
    const second = submission.send("steer", { turnPolicy: "steer" });
    await waitFor(() => local.posts.length === 2);
    local.accept(1);
    expect(await second).toEqual({ status: "accepted" });
  });

  test.each(["accepted", "cancelled", "unconfirmed"] as const)(
    "%s submission releases its abort listener and acceptance registration",
    async (status) => {
      const local = transport();
      const submission = createSubmission();
      const controller = new AbortController();
      const listen = spyOn(controller.signal, "addEventListener");
      const removeRegistration = spyOn(WeakMap.prototype, "delete");
      const dispatch = spyOn(submission.store, "send");
      cleanups.push(
        () => listen.mockRestore(),
        () => removeRegistration.mockRestore(),
        () => dispatch.mockRestore()
      );
      const operation = submission.send("draft", { signal: controller.signal });
      await waitFor(() => local.posts.length === 1);
      const headers = dispatch.mock.calls[0]?.[0].headers;
      expect(headers).toBeDefined();

      const listenerOptions = listen.mock.calls.find(
        ([event]) => event === "abort"
      )?.[2];

      if (status === "cancelled") {
        controller.abort();
      } else if (status === "accepted") {
        local.accept(0);
      } else {
        local.fail(0);
      }

      const outcome = await operation;
      expect(outcome.status).toBe(status);
      expect(listenerOptions).toEqual(
        expect.objectContaining({
          signal: expect.objectContaining({ aborted: true }),
        })
      );
      expect(
        removeRegistration.mock.calls.some(([key]) => key === headers)
      ).toBe(true);

      if (status === "cancelled") {
        local.accept(0);
      }
    }
  );

  test("mount resumes the attached session once across Strict Mode replay and publishes fresh snapshots", async () => {
    const completed: MessageStreamEvent = {
      data: {
        usage: {
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
        },
      },
      meta: { at: "2026-10-31T00:00:01.000Z", id: "complete" },
      type: "session.completed",
    };

    const local = transport([received(), completed]);

    const submission = createSubmission({
      initialSession: { sessionId: "local-session", streamIndex: 0 },
    });

    const observed: string[] = [];
    const sessions: string[] = [];
    const finished: string[] = [];
    submission.store.setCallbacks({
      onEvent: (event) => observed.push(event.meta.id),
      onFinish: (snapshot) => finished.push(snapshot.status),
      onSessionChange: (session) => {
        if (session) {
          sessions.push(session.sessionId);
        }
      },
    });
    let snapshots = 0;

    const unsubscribe = submission.store.subscribe(() => {
      snapshots += 1;
    });

    cleanups.push(unsubscribe);
    const resume = spyOn(submission.store, "resume");
    cleanups.push(() => resume.mockRestore());
    let staleResumes = 0;
    let currentResumes = 0;

    const detachFirst = submission.mount(() => {
      staleResumes += 1;
    });

    detachFirst();

    const detachSecond = submission.mount(() => {
      currentResumes += 1;
    });

    cleanups.push(detachSecond);
    await waitFor(() => currentResumes === 1);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(local.posts).toHaveLength(0);
    expect(observed).toEqual(["received-delivery-0", "complete"]);
    expect(sessions.every((session) => session === "local-session")).toBe(true);
    expect(finished).toEqual(["ready"]);
    expect(staleResumes).toBe(0);
    expect(snapshots).toBeGreaterThan(0);
    expect(submission.store.snapshot.data.messages[0]?.role).toBe("user");
    expect(submission.store.snapshot.status).toBe("ready");
  });

  test("unmount detaches an accepted local stream without durable cancellation and Strict Mode replay preserves it", async () => {
    const local = transport();
    const submission = createSubmission();
    const detachFirst = submission.mount(() => {});
    const first = submission.send("first");
    await waitFor(() => local.posts.length === 1);
    local.accept(0);
    await first;
    await waitFor(() => local.streams.length === 1);
    detachFirst();
    const detachSecond = submission.mount(() => {});
    await Bun.sleep(0);
    expect(submission.store.snapshot.session?.sessionId).toBe("local-session");
    detachSecond();
    await Bun.sleep(0);
    expect(submission.store.snapshot.session).toBeUndefined();
    expect(submission.store.snapshot.status).toBe("ready");
    expect(local.posts).toHaveLength(1);
  });
});
