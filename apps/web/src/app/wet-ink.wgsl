struct Light { position: vec2f, size: vec2f, strength: f32, scale: f32 }
@group(0) @binding(0) var lettering: texture_2d<f32>;
@group(0) @binding(1) var linear: sampler;
@group(0) @binding(2) var<uniform> light: Light;

@fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let mask = textureSampleLevel(lettering, linear, uv, 0.0).a;
  let p = (uv * light.size - light.position) / light.scale;
  // A thin curved reflection across a gently uneven ink surface.
  let bend = p.x * 0.32 + sin(p.x * 3.0) * 0.035;
  let band = exp(-pow((p.y + bend) / 0.055, 2.0));
  let shoulder = exp(-pow((p.y + bend) / 0.18, 2.0)) * 0.14;
  let falloff = exp(-dot(p, p) / 0.55);
  let grain = fract(sin(dot(uv * light.size, vec2f(12.9898, 78.233))) * 43758.5453);
  let alpha = mask * (band + shoulder) * falloff * light.strength * (0.2 + grain * 0.045);
  return vec4f(vec3f(0.68, 0.67, 0.63) * alpha, alpha);
}
