import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { Schema } from "effect";

import type {
  PreviewConnection,
  PreviewProcess,
} from "./social-preview-lifecycle";
import { previewCommandResultSchema } from "./social-preview-lifecycle";

type ProcessExit = Awaited<PreviewProcess["exited"]>;

type CommandResult = typeof previewCommandResultSchema.Type;

export const observePreviewProcess = (child: ChildProcess): PreviewProcess => {
  let settled = false;
  let stopping: Promise<void> | undefined;
  const completion = Promise.withResolvers<ProcessExit>();

  const finish = (result: ProcessExit) => {
    if (settled) {
      return;
    }

    settled = true;
    completion.resolve(result);
  };

  const onError = (error: Error) => finish({ code: null, error, signal: null });

  const onExit = (code: number | null, signal: string | null) =>
    finish({ code, signal });

  child.on("error", onError);
  child.on("exit", onExit);

  const exited = completion.promise.then((result) => {
    child.off("error", onError);
    child.off("exit", onExit);

    return result;
  });

  if (child.exitCode !== null || child.signalCode !== null) {
    finish({ code: child.exitCode, signal: child.signalCode });
  }

  return {
    exited,
    stop() {
      stopping ??= (async () => {
        if (!settled) {
          child.kill();
        }

        await exited;
      })();

      return stopping;
    },
  };
};

export const spawnPreviewProcess = (
  command: string,
  args: string[],
  inherit = false
): PreviewProcess =>
  observePreviewProcess(
    spawn(command, args, { stdio: inherit ? "inherit" : "ignore" })
  );

const responseSchema = Schema.Struct({
  error: Schema.optionalKey(Schema.Unknown),
  id: Schema.optionalKey(Schema.Number),
  method: Schema.optionalKey(Schema.String),
  result: Schema.optionalKey(previewCommandResultSchema),
});

const targetSchema = Schema.Struct({ webSocketDebuggerUrl: Schema.String });

export interface PreviewSocket extends EventTarget {
  readonly readyState: number;
  send: (data: string) => void;
  close: () => void;
}

export const createPreviewConnection = (
  connection: PreviewSocket
): PreviewConnection => {
  let nextId = 0;
  let failure: Error | undefined;
  let closed = false;

  const pending = new Map<
    number,
    ReturnType<typeof Promise.withResolvers<CommandResult>>
  >();

  const opening = new Set<PromiseWithResolvers<undefined>>();

  const fail = (error: Error) => {
    failure ??= error;

    for (const request of pending.values()) {
      request.reject(failure);
    }

    pending.clear();

    for (const waiter of opening) {
      waiter.reject(failure);
    }

    opening.clear();
  };

  const onOpen = () => {
    for (const waiter of opening) {
      waiter.resolve(undefined);
    }

    opening.clear();
  };

  const onClose = () => fail(new Error("Chromium socket closed."));
  const onError = () => fail(new Error("Chromium socket failed."));

  const onMessage = (event: Event) => {
    try {
      if (!(event instanceof MessageEvent)) {
        throw new TypeError("Invalid Chromium message event.");
      }

      const raw: unknown = JSON.parse(String(event.data));
      const message = Schema.decodeUnknownSync(responseSchema)(raw);

      if (message.id === undefined) {
        if (message.method === undefined) {
          throw new Error("Missing Chromium response id.");
        }

        return;
      }

      const request = pending.get(message.id);

      if (!request) {
        return;
      }

      pending.delete(message.id);

      if ("error" in message) {
        request.reject(new Error(JSON.stringify(message.error)));
      } else if (message.result === undefined) {
        request.reject(new Error("Missing Chromium command result."));
      } else {
        request.resolve(message.result);
      }
    } catch (error) {
      fail(new Error("Malformed Chromium response.", { cause: error }));
    }
  };

  connection.addEventListener("open", onOpen);
  connection.addEventListener("close", onClose);
  connection.addEventListener("error", onError);
  connection.addEventListener("message", onMessage);

  return {
    close() {
      if (closed) {
        return;
      }

      closed = true;
      fail(new Error("Chromium connection disposed."));
      connection.removeEventListener("open", onOpen);
      connection.removeEventListener("close", onClose);
      connection.removeEventListener("error", onError);
      connection.removeEventListener("message", onMessage);
      connection.close();
    },
    command(method, params, signal) {
      if (failure) {
        return Promise.reject(failure);
      }

      if (signal.aborted) {
        return Promise.reject(new Error("Chromium command interrupted."));
      }

      nextId += 1;
      const id = nextId;
      const request = Promise.withResolvers<CommandResult>();

      const abort = () =>
        request.reject(new Error("Chromium command interrupted."));

      const timer = setTimeout(
        () => request.reject(new Error(`Chromium timed out: ${method}`)),
        30_000
      );

      pending.set(id, request);
      signal.addEventListener("abort", abort, { once: true });

      try {
        connection.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        request.reject(
          new Error("Chromium command send failed.", { cause: error })
        );
      }

      return request.promise.finally(() => {
        clearTimeout(timer);
        pending.delete(id);
        signal.removeEventListener("abort", abort);
      });
    },
    ready(signal) {
      if (failure) {
        return Promise.reject(failure);
      }

      if (signal.aborted) {
        return Promise.reject(new Error("Chromium connection interrupted."));
      }

      if (connection.readyState === WebSocket.OPEN) {
        return Promise.resolve();
      }

      if (connection.readyState !== WebSocket.CONNECTING) {
        return Promise.reject(new Error("Chromium socket closed."));
      }

      const waiter = Promise.withResolvers<undefined>();

      const abort = () =>
        waiter.reject(new Error("Chromium connection interrupted."));

      opening.add(waiter);
      signal.addEventListener("abort", abort, { once: true });

      return waiter.promise.finally(() => {
        opening.delete(waiter);
        signal.removeEventListener("abort", abort);
      });
    },
  };
};

const previewPort = async (
  temporary: string,
  signal: AbortSignal,
  attempt = 0
): Promise<string> => {
  signal.throwIfAborted();

  const port = await readFile(
    path.join(temporary, "browser/DevToolsActivePort"),
    "utf-8"
  )
    .then((contents) => contents.split("\n")[0])
    .catch(() => "");

  if (port) {
    return port;
  }

  await delay(100, undefined, { signal });

  if (attempt === 99) {
    throw new Error("Chromium did not start. Check CHROMIUM_PATH.");
  }

  return previewPort(temporary, signal, attempt + 1);
};

export const previewTarget = async (
  temporary: string,
  signal: AbortSignal
): Promise<string> => {
  const port = await previewPort(temporary, signal);

  const response = await fetch(
    `http://127.0.0.1:${port}/json/new?about:blank`,
    { method: "PUT", signal }
  );

  const target: unknown = await response.json();

  return Schema.decodeUnknownSync(targetSchema)(target).webSocketDebuggerUrl;
};
