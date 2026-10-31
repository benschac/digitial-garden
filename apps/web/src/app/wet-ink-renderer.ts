import { effect, frame, init, sampler, surface } from "vgpu";

import {
  createWetInkTextureSlot,
  withWetInkResources,
} from "./wet-ink-resources";
import wetInkShader from "./wet-ink.wgsl";

interface TextMask {
  texture: GPUTexture;
  width: number;
  height: number;
  fontSize: number;
}

export const createWetInkRenderer = (
  canvas: HTMLCanvasElement,
  text: HTMLSpanElement,
  signal: AbortSignal
) =>
  withWetInkResources(signal, async (owner) => {
    await document.fonts.ready;
    signal.throwIfAborted();

    const gpu = await owner.acquirePromise(
      () => init(),
      (resource) => resource.dispose()
    );

    const drawingSurface = owner.acquire(
      () =>
        surface(gpu, canvas, {
          alphaMode: "premultiplied",
          autoResize: false,
          size: [1, 1],
        }),
      (resource) => resource.dispose()
    );

    const shader = owner.acquire(
      () =>
        effect(gpu, wetInkShader, {
          label: "wet-ink-reflection",
          set: {
            light: { position: [0, 0], scale: 100, size: [1, 1], strength: 0 },
            linear: sampler(gpu, { magFilter: "linear", minFilter: "linear" }),
          },
        }),
      (resource) => resource.dispose()
    );

    await shader.compile(drawingSurface);
    signal.throwIfAborted();

    const texture = createWetInkTextureSlot<TextMask>(owner, (resource) =>
      resource.texture.destroy()
    );

    const bind = (resource: TextMask) => {
      drawingSurface.resize([resource.texture.width, resource.texture.height]);
      shader.set({
        light: {
          scale: resource.fontSize,
          size: [resource.width, resource.height],
        },
      });
      shader.set({ lettering: resource.texture.createView() });
    };

    const resize = () => {
      const bounds = text.getBoundingClientRect();
      const style = getComputedStyle(text);
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const width = Math.max(bounds.width, 1);
      const height = Math.max(bounds.height, 1);
      const fontSize = Number.parseFloat(style.fontSize);
      const raster = document.createElement("canvas");
      raster.width = Math.ceil(width * ratio);
      raster.height = Math.ceil(height * ratio);
      const context = raster.getContext("2d");

      if (!context) {
        throw new Error("Text mask is unavailable.");
      }

      context.scale(ratio, ratio);
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.fontKerning = "normal";
      context.letterSpacing = style.letterSpacing;
      context.fillStyle = "white";
      const node = text.firstChild;

      if (!node || node.nodeType !== Node.TEXT_NODE) {
        throw new Error("Expected heading text.");
      }

      const content = node.textContent ?? "";
      const range = document.createRange();
      let lineStart = 0;
      let lineTop = Number.NaN;

      const paint = (end: number) => {
        if (end <= lineStart) {
          return;
        }

        range.setStart(node, lineStart);
        range.setEnd(node, end);
        const rect = range.getBoundingClientRect();
        const label = content.slice(lineStart, end);
        const metrics = context.measureText(label);

        const fontHeight =
          metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;

        const baseline =
          rect.top -
          bounds.top +
          (rect.height - fontHeight) / 2 +
          metrics.fontBoundingBoxAscent;

        context.fillText(label, rect.left - bounds.left, baseline);
      };

      for (let index = 0; index < content.length; index += 1) {
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rect = range.getBoundingClientRect();

        if (Number.isFinite(lineTop) && Math.abs(rect.top - lineTop) > 2) {
          paint(index);
          lineStart = index;
        }

        lineTop = rect.top;
      }

      paint(content.length);
      texture.replace(
        () => ({
          fontSize,
          height,
          texture: gpu.gpu.createTexture({
            format: "rgba8unorm",
            size: [raster.width, raster.height],
            usage:
              GPUTextureUsage.COPY_DST |
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.RENDER_ATTACHMENT,
          }),
          width,
        }),
        (resource) => {
          gpu.gpu.queue.copyExternalImageToTexture(
            { source: raster },
            { texture: resource.texture },
            [raster.width, raster.height]
          );
          bind(resource);
        },
        bind
      );
    };

    resize();

    return {
      render(x: number, y: number, strength: number) {
        shader.set({ light: { position: [x, y], strength } });
        frame(gpu, (current) =>
          current.pass({ clear: [0, 0, 0, 0], target: drawingSurface }, shader)
        );
      },
      resize,
    };
  });
