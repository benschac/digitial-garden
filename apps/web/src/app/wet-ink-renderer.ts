import { effect, frame, init, sampler, surface } from "vgpu";
import wetInkShader from "./wet-ink.wgsl";

/** Rasterize only on layout/font changes; the live reflection stays on the GPU. */
export async function createWetInkRenderer(
  canvas: HTMLCanvasElement,
  text: HTMLSpanElement,
  signal: AbortSignal,
) {
  await document.fonts.ready;
  if (signal.aborted) return null;
  const gpu = await init();
  if (signal.aborted) {
    gpu.dispose();
    return null;
  }
  let output: ReturnType<typeof surface> | undefined;
  let texture: GPUTexture | undefined;
  try {
    output = surface(gpu, canvas, {
      size: [1, 1],
      autoResize: false,
      alphaMode: "premultiplied",
    });
    const shader = effect(gpu, wetInkShader, {
      label: "wet-ink-reflection",
      set: {
        linear: sampler(gpu, { minFilter: "linear", magFilter: "linear" }),
        light: { position: [0, 0], size: [1, 1], strength: 0, scale: 100 },
      },
    });
    await shader.compile(output);
    if (signal.aborted) {
      output.dispose();
      gpu.dispose();
      return null;
    }
    const drawingSurface = output;
    let width = 1;
    let height = 1;
    let fontSize = 100;
    const resize = () => {
      const bounds = text.getBoundingClientRect();
      const style = getComputedStyle(text);
      const ratio = Math.min(devicePixelRatio || 1, 2);
      width = Math.max(bounds.width, 1);
      height = Math.max(bounds.height, 1);
      fontSize = parseFloat(style.fontSize);
      const raster = document.createElement("canvas");
      raster.width = Math.ceil(width * ratio);
      raster.height = Math.ceil(height * ratio);
      const context = raster.getContext("2d");
      if (!context) throw new Error("Text mask is unavailable.");
      context.scale(ratio, ratio);
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.fontKerning = "normal";
      context.letterSpacing = style.letterSpacing;
      context.fillStyle = "white";
      const node = text.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE)
        throw new Error("Expected heading text.");
      const content = node.textContent ?? "";
      const range = document.createRange();
      let lineStart = 0;
      let lineTop = Number.NaN;
      const paint = (end: number) => {
        if (end <= lineStart) return;
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
      for (let index = 0; index < content.length; index++) {
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
      const nextTexture = gpu.gpu.createTexture({
        size: [raster.width, raster.height],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      gpu.gpu.queue.copyExternalImageToTexture(
        { source: raster },
        { texture: nextTexture },
        [raster.width, raster.height],
      );
      shader.set({
        lettering: nextTexture.createView(),
        light: { size: [width, height], scale: fontSize },
      });
      texture?.destroy();
      texture = nextTexture;
      drawingSurface.resize([raster.width, raster.height]);
    };
    resize();
    return {
      resize,
      render(x: number, y: number, strength: number) {
        shader.set({ light: { position: [x, y], strength } });
        frame(gpu, (current) =>
          current.pass({ target: drawingSurface, clear: [0, 0, 0, 0] }, shader),
        );
      },
      destroy() {
        texture?.destroy();
        drawingSurface.dispose();
        gpu.dispose();
      },
    };
  } catch (error) {
    texture?.destroy();
    output?.dispose();
    gpu.dispose();
    throw error;
  }
}
