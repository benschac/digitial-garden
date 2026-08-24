export type ParticleEngine = {
  gpu_frame_command_byte_length: () => number;
  initialize: (
    seed: number,
    count: number,
    width: number,
    height: number,
  ) => void;
  initialize_gpu_controller: (
    capacity: number,
    activeParticles: number,
    width: number,
    height: number,
  ) => number;
  memory: WebAssembly.Memory;
  particle_count: () => number;
  prepare_gpu_frame: (
    elapsedSeconds: number,
    deltaSeconds: number,
    pointerX: number,
    pointerY: number,
    interaction: number,
    simulationSpeed: number,
  ) => number;
  resize: (width: number, height: number) => void;
  resize_gpu_controller: (width: number, height: number) => void;
  set_gpu_particle_count: (count: number) => number;
  set_particle_count: (count: number) => void;
  step: (
    time: number,
    pointerX: number,
    pointerY: number,
    interaction: number,
    simulationSpeed: number,
  ) => number;
};

const WASM_PATH = "/wasm/particle-engine.wasm";

export async function loadParticleEngine(signal: AbortSignal) {
  const response = await fetch(WASM_PATH, { signal });
  if (!response.ok) {
    throw new Error(`WASM request failed with ${response.status}`);
  }

  const module = await WebAssembly.instantiate(
    await response.arrayBuffer(),
    {},
  );
  if (signal.aborted) {
    throw new DOMException("The renderer load was aborted.", "AbortError");
  }

  return module.instance.exports as ParticleEngine;
}
