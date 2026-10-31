import { describe, expect, test } from "bun:test";

import { Effect } from "effect";

import { renderSocialPreview } from "./social-preview-lifecycle";
import type {
  PreviewDependencies,
  PreviewProcess,
} from "./social-preview-lifecycle";

const fixture = () => {
  const events: string[] = [];
  const frames: string[] = [];
  const commands: object[] = [];
  const encoders: string[][] = [];

  const process = (name: string, code?: number): PreviewProcess => ({
    exited:
      code === undefined
        ? Promise.withResolvers<never>().promise
        : Promise.resolve({ code, signal: null }),
    stop: () => {
      events.push(`${name} stop`);

      return Promise.resolve();
    },
  });

  const dependencies: PreviewDependencies = {
    browser: () => process("browser"),
    connect: () => ({
      close: () => {
        events.push("socket close");
      },
      command: (method, params) => {
        commands.push({ method, params });

        if (method === "Page.captureScreenshot") {
          return Promise.resolve({ data: "cG5n" });
        }

        return Promise.resolve({ result: { value: true } });
      },
      ready: () => Promise.resolve(),
    }),
    encoder: (args) => {
      encoders.push(args);

      return process("encoder", 0);
    },
    font: () => Promise.resolve(Buffer.from("font")),
    html: () => "document",
    mkdir: () => Promise.resolve(),
    output: "/injected/output",
    remove: () => {
      events.push("remove");

      return Promise.resolve();
    },
    target: () => Promise.resolve("ws://injected"),
    temporary: () => Promise.resolve("/injected/temporary"),
    write: (path) => {
      frames.push(path);

      return Promise.resolve();
    },
  };

  return { commands, dependencies, encoders, events, frames, process };
};

describe("social preview ownership", () => {
  test("preserves ordered 240 frames and both encoder contracts, releasing once", async () => {
    const f = fixture();
    await Effect.runPromise(renderSocialPreview(f.dependencies));
    expect(f.frames).toHaveLength(240);
    expect(f.frames[0]).toBe("/injected/temporary/0000.png");
    expect(f.frames[239]).toBe("/injected/temporary/0239.png");
    expect(f.commands[0]).toEqual({
      method: "Emulation.setDeviceMetricsOverride",
      params: { deviceScaleFactor: 1, height: 630, mobile: false, width: 1200 },
    });
    expect(f.commands[480]).toEqual({
      method: "Runtime.evaluate",
      params: {
        expression:
          "document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 7966.666666666667; })",
      },
    });
    expect(f.encoders).toEqual([
      [
        "-framerate",
        "30",
        "-i",
        "/injected/temporary/%04d.png",
        "-an",
        "-c:v",
        "libx264",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "/injected/output/home.mp4",
      ],
      [
        "-i",
        "/injected/temporary/0000.png",
        "-frames:v",
        "1",
        "-q:v",
        "2",
        "/injected/output/home.jpg",
      ],
    ]);
    expect(f.events).toEqual([
      "socket close",
      "encoder stop",
      "encoder stop",
      "browser stop",
      "remove",
    ]);
  });

  test("missing font releases temporary directory before any process starts", async () => {
    const f = fixture();
    f.dependencies.font = () => Promise.reject(new Error("missing font"));

    await expect(
      Effect.runPromise(renderSocialPreview(f.dependencies))
    ).rejects.toThrow("Social preview");
    expect(f.events).toEqual(["remove"]);
  });

  test.each([true, false])(
    "missing browser and early browser exit both release the directory (%s)",
    async (missing) => {
      const f = fixture();
      f.dependencies.browser = () => {
        if (missing) {
          throw new Error("missing browser");
        }

        return f.process("browser", 1);
      };

      f.dependencies.target = () => Promise.withResolvers<never>().promise;
      await expect(
        Effect.runPromise(renderSocialPreview(f.dependencies))
      ).rejects.toThrow("Social preview");
      expect(f.events).toEqual(
        missing ? ["remove"] : ["browser stop", "remove"]
      );
    }
  );

  test.each([true, false])(
    "frame write and malformed screenshot failures close socket/browser and never encode (%s)",
    async (malformed) => {
      const f = fixture();

      if (malformed) {
        f.dependencies.connect = () => ({
          close: () => {
            f.events.push("socket close");
          },
          command: (method) =>
            Promise.resolve(
              method === "Page.captureScreenshot"
                ? {}
                : { result: { value: true } }
            ),
          ready: () => Promise.resolve(),
        });
      } else {
        f.dependencies.write = () => Promise.reject(new Error("write failed"));
      }

      await expect(
        Effect.runPromise(renderSocialPreview(f.dependencies))
      ).rejects.toThrow("Social preview");
      expect(f.events).toEqual(["socket close", "browser stop", "remove"]);
      expect(f.encoders).toHaveLength(0);
    }
  );

  test.each([true, false])(
    "missing encoder and encoder failure release all acquired resources (%s)",
    async (missing) => {
      const f = fixture();
      f.dependencies.encoder = () => {
        if (missing) {
          throw new Error("missing encoder");
        }

        return f.process("encoder", 1);
      };

      await expect(
        Effect.runPromise(renderSocialPreview(f.dependencies))
      ).rejects.toThrow("Social preview");
      expect(f.events).toEqual(
        missing
          ? ["socket close", "browser stop", "remove"]
          : ["socket close", "encoder stop", "browser stop", "remove"]
      );
    }
  );

  test("interruption while encoding awaits cleanup exactly once", async () => {
    const f = fixture();
    const controller = new AbortController();
    f.dependencies.encoder = () => {
      queueMicrotask(() => controller.abort());

      return f.process("encoder");
    };

    await expect(
      Effect.runPromise(renderSocialPreview(f.dependencies), {
        signal: controller.signal,
      })
    ).rejects.toThrow();
    expect(f.events).toEqual([
      "socket close",
      "encoder stop",
      "browser stop",
      "remove",
    ]);
  });

  test("late temporary acquisition remains owned after interruption", async () => {
    const f = fixture();
    const controller = new AbortController();
    f.dependencies.temporary = async () => {
      controller.abort();
      await Promise.resolve();

      return "/injected/late";
    };

    await expect(
      Effect.runPromise(renderSocialPreview(f.dependencies), {
        signal: controller.signal,
      })
    ).rejects.toThrow();
    expect(f.events).toEqual(["remove"]);
  });
});
