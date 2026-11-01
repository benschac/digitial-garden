import { describe, expect, test } from "bun:test";

import { execa } from "execa";

import {
  createPreviewConnection,
  spawnPreviewProcess,
} from "./social-preview-native";
import type { PreviewSocket } from "./social-preview-native";

class Socket extends EventTarget implements PreviewSocket {
  readyState: number = WebSocket.OPEN;
  sent: string[] = [];
  closes = 0;
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closes += 1;
  }
  message(data: string) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

describe("native preview adapters", () => {
  test.each(["close", "error"])(
    "%s settles every command and future requests promptly",
    async (event) => {
      const socket = new Socket();
      const connection = createPreviewConnection(socket);
      const { signal } = new AbortController();
      const first = connection.command("first", {}, signal);
      const second = connection.command("second", {}, signal);
      socket.dispatchEvent(new Event(event));

      const results = await Promise.allSettled([
        first,
        second,
        connection.command("third", {}, signal),
      ]);

      expect(results.map((result) => result.status)).toEqual([
        "rejected",
        "rejected",
        "rejected",
      ]);
      connection.close();
      connection.close();
      expect(socket.closes).toBe(1);
    }
  );

  test.each(["{", "null", '{"id":"bad"}', '{"id":1}', "{}"])(
    "malformed protocol %s cannot strand requests",
    async (message) => {
      const socket = new Socket();
      const connection = createPreviewConnection(socket);

      const request = connection.command(
        "capture",
        {},
        new AbortController().signal
      );

      socket.message(message);
      await expect(request).rejects.toThrow();
      connection.close();
    }
  );

  test("events and out-of-order responses retain request identity", async () => {
    const socket = new Socket();
    const connection = createPreviewConnection(socket);
    const { signal } = new AbortController();
    const first = connection.command("first", {}, signal);
    const second = connection.command("second", {}, signal);
    socket.message('{"method":"Page.event","params":{}}');
    socket.message('{"id":2,"result":{"data":"second"}}');
    socket.message('{"id":1,"result":{"data":"first"}}');
    expect(await first).toEqual({ data: "first" });
    expect(await second).toEqual({ data: "second" });
    connection.close();
  });

  test("opening close, command interruption, and synchronous send failure settle", async () => {
    const socket = new Socket();
    socket.readyState = WebSocket.CONNECTING;
    const connection = createPreviewConnection(socket);
    const ready = connection.ready(new AbortController().signal);
    socket.dispatchEvent(new Event("close"));
    await expect(ready).rejects.toThrow("closed");
    connection.close();
    const other = new Socket();
    const active = createPreviewConnection(other);
    const controller = new AbortController();
    const request = active.command("waiting", {}, controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow("interrupted");
    other.send = () => {
      throw new Error("send failure");
    };

    await expect(
      active.command("send", {}, new AbortController().signal)
    ).rejects.toThrow("send failed");
    active.close();
  });

  test("missing native browser/encoder executable is observed without an unhandled error", async () => {
    const child = spawnPreviewProcess(
      "/nonexistent/social-preview-executable",
      []
    );

    const result = await child.exited;
    expect(result.error).toBeInstanceOf(Error);
    await child.stop();
    await child.stop();
  });

  test("controlled native child is terminated and reaped once", async () => {
    const child = spawnPreviewProcess(process.execPath, [
      "-e",
      "setInterval(() => {}, 1000)",
    ]);

    const stopped = child.stop();
    expect(child.stop()).toBe(stopped);
    await stopped;
    const result = await child.exited;
    expect(result.code).toBeNull();
    expect(result.signal).toBe("SIGTERM");
  });

  test("already signal-exited native child does not wait for another exit", async () => {
    const child = spawnPreviewProcess(process.execPath, [
      "-e",
      "process.kill(process.pid, 'SIGTERM')",
    ]);

    const result = await child.exited;
    await child.stop();
    expect(result.signal).toBe("SIGTERM");
  });

  test.each([0, 7])("retains native exit code %s", async (code) => {
    const child = spawnPreviewProcess(process.execPath, [
      "-e",
      `process.exit(${code})`,
    ]);

    const result = await child.exited;
    await child.stop();
    expect(result.code).toBe(code);
    expect(result.signal).toBeNull();

    if (code === 0) {
      expect(result.error).toBeUndefined();
    } else {
      expect(result.error).toBeInstanceOf(Error);
    }
  });

  test.each([true, false])(
    "preserves inherited stdio (%s)",
    async (inherit) => {
      const moduleUrl = new URL("social-preview-native.ts", import.meta.url);

      const script = [
        `import { spawnPreviewProcess } from ${JSON.stringify(moduleUrl.href)};`,
        `const child = spawnPreviewProcess(process.execPath, ["-e", "console.log('preview stdout'); console.error('preview stderr')"], ${inherit});`,
        "await child.exited; await child.stop();",
      ].join("\n");

      const result = await execa(process.execPath, ["-e", script]);
      expect(result.stdout).toBe(inherit ? "preview stdout" : "");
      expect(result.stderr).toBe(inherit ? "preview stderr" : "");
    }
  );
});
