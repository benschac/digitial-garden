import type { UserContent } from "ai";
import { Effect } from "effect";
import { Client, conversationReducer, EveAgentStore } from "eve/client";
import type {
  ClientSession,
  ConversationState,
  CreatedClientSession,
  CreatedIdleClientSession,
  CreateSessionOptions,
  EveAgentStoreInit,
  SendTurnInput,
  SendTurnOptions,
} from "eve/client";

import type { PromptInputSubmissionOutcome } from "@/components/ai-elements/prompt-input-attachments";

interface SubmissionOperation {
  readonly signal: AbortSignal | undefined;
  readonly settle: (outcome: PromptInputSubmissionOutcome) => void;
}

export const createAgentChatSubmission = (
  options: Omit<EveAgentStoreInit<ConversationState>, "reducer"> = {}
) => {
  const client =
    options.client ??
    new Client({
      auth: options.auth,
      headers: options.headers,
      host: options.host ?? "",
    });

  const operations = new WeakMap<
    Readonly<Record<string, string>>,
    SubmissionOperation
  >();

  const observedSessions = new WeakSet<ClientSession>();

  const observe = async <T>(
    headers: Readonly<Record<string, string>> | undefined,
    signal: AbortSignal | undefined,
    dispatch: () => Promise<T>
  ): Promise<T> => {
    const operation =
      headers === undefined ? undefined : operations.get(headers);

    const cancel = () => operation?.settle({ status: "cancelled" });
    signal?.addEventListener("abort", cancel, { once: true });

    try {
      if (signal?.aborted) {
        cancel();
      }

      const response = await dispatch();
      operation?.settle(
        signal?.aborted || operation.signal?.aborted
          ? { status: "cancelled" }
          : { status: "accepted" }
      );

      return response;
    } catch (error) {
      operation?.settle(
        signal?.aborted || operation.signal?.aborted
          ? { status: "cancelled" }
          : {
              message:
                error instanceof Error
                  ? error.message
                  : "Message acceptance could not be confirmed.",
              status: "unconfirmed",
            }
      );
      throw error;
    } finally {
      signal?.removeEventListener("abort", cancel);
    }
  };

  const observeSession = (session: ClientSession) => {
    if (observedSessions.has(session)) {
      return session;
    }

    observedSessions.add(session);
    const send = session.send.bind(session);
    session.send = (message, sendOptions) =>
      observe(sendOptions?.headers, sendOptions?.signal, () =>
        send(message, sendOptions)
      );

    return session;
  };

  const createSession = client.sessions.create.bind(client.sessions);
  function create<TOutput>(
    input: SendTurnInput<TOutput> & CreateSessionOptions
  ): Promise<CreatedClientSession<TOutput>>;
  function create(
    input?: CreateSessionOptions
  ): Promise<CreatedIdleClientSession>;
  async function create<TOutput>(
    input:
      | (SendTurnInput<TOutput> & CreateSessionOptions)
      | CreateSessionOptions = {}
  ) {
    const result =
      "message" in input
        ? await observe(input.headers, input.signal, () => createSession(input))
        : await createSession(input);

    observeSession(result.session);

    return result;
  }

  client.sessions.create = create;
  const attachSession = client.sessions.attach.bind(client.sessions);
  client.sessions.attach = (...args) => observeSession(attachSession(...args));

  if (options.session) {
    observeSession(options.session);
  }

  const store = new EveAgentStore({
    ...options,
    client,
    reducer: conversationReducer,
  });

  const send = (
    message: string | UserContent,
    sendOptions: SendTurnOptions = {}
  ): Promise<PromptInputSubmissionOutcome> => {
    const headers = { ...sendOptions.headers };
    const { signal } = sendOptions;
    const controller = new AbortController();
    const listeners = new AbortController();

    return Effect.runPromise(
      Effect.callback<PromptInputSubmissionOutcome>((resume) => {
        const settle = (outcome: PromptInputSubmissionOutcome) =>
          resume(Effect.succeed(outcome));

        if (signal?.aborted) {
          controller.abort(signal.reason);
          settle({ status: "cancelled" });

          return;
        }

        operations.set(headers, { settle, signal });
        signal?.addEventListener(
          "abort",
          () => {
            controller.abort(signal.reason);
            settle({ status: "cancelled" });
          },
          { once: true, signal: listeners.signal }
        );

        const dispatch = async () => {
          try {
            await store.send({
              ...sendOptions,
              headers,
              message,
              signal: controller.signal,
            });
            settle({
              message:
                "Message acceptance could not be confirmed. Check the conversation before trying again.",
              status: "unconfirmed",
            });
          } catch (error) {
            settle({
              message:
                error instanceof Error
                  ? error.message
                  : "Message acceptance could not be confirmed.",
              status: "unconfirmed",
            });
          }
        };

        void dispatch();
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            listeners.abort();
            operations.delete(headers);
          })
        )
      )
    );
  };

  let mounted = false;

  const mount = (onResumed: () => void) => {
    mounted = true;
    let current = true;

    const finish = () => {
      if (current) {
        onResumed();
      }
    };

    const timeout =
      options.initialSession === undefined && options.session === undefined
        ? undefined
        : setTimeout(() => {
            void store.resume().then(finish, finish);
          }, 0);

    return () => {
      current = false;
      mounted = false;
      clearTimeout(timeout);
      queueMicrotask(() => {
        if (!mounted) {
          store.reset();
        }
      });
    };
  };

  return { mount, send, store };
};
