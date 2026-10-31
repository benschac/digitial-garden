import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { once } from "node:events";

import {
  createPreviewConnection,
  observePreviewProcess,
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
    const child = spawn(
      process.execPath,
      ["-e", "setInterval(() => {}, 1000)"],
      { stdio: "ignore" }
    );

    const observed = observePreviewProcess(child);
    await once(child, "spawn");
    await Promise.all([observed.stop(), observed.stop()]);
    const result = await observed.exited;
    expect(result.signal).toBe("SIGTERM");
  });

  test("already signal-exited native child does not wait for another exit", async () => {
    const child = spawn(
      process.execPath,
      ["-e", "process.kill(process.pid, 'SIGTERM')"],
      { stdio: "ignore" }
    );

    await once(child, "exit");
    const observed = observePreviewProcess(child);
    await observed.stop();
    const result = await observed.exited;
    expect(result.signal).toBe("SIGTERM");
  });
});
