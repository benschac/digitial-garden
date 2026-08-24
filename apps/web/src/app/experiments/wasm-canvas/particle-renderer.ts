export type ParticleFrame = {
  deltaSeconds: number;
  elapsedSeconds: number;
  interaction: number;
  pointerX: number;
  pointerY: number;
  simulationSpeed: number;
};

export type ParticleRenderer = {
  destroy: () => void;
  kind: "Rust/WASM + WebGPU" | "WebAssembly + Canvas 2D";
  maxParticleCount: number;
  render: (frame: ParticleFrame) => void;
  resize: (width: number, height: number, pixelRatio: number) => void;
  setParticleCount: (count: number) => number;
};
