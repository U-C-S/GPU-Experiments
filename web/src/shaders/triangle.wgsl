struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  accent: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) pulse: f32,
}

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var positions = array<vec2f, 3>(
    vec2f(0.0, 0.74),
    vec2f(-0.74, -0.58),
    vec2f(0.74, -0.58)
  );

  var output: VertexOutput;
  var position = positions[vertexIndex];
  let sway = 0.035 * sin(uniforms.time * 1.3 + f32(vertexIndex) * 1.7);

  position.x += sway * (1.0 - abs(position.y));

  output.position = vec4f(position, 0.0, 1.0);
  output.uv = position * 0.5 + vec2f(0.5, 0.5);
  output.pulse = 0.5 + 0.5 * sin(uniforms.time * 2.0 + f32(vertexIndex));
  return output;
}

@fragment
fn fsMain(input: VertexOutput) -> @location(0) vec4f {
  let tint = vec3f(
    0.12 + uniforms.accent * 0.45,
    0.25 + input.uv.x * 0.45,
    0.45 + input.uv.y * 0.35
  );
  let pulse = 0.18 * input.pulse;
  let color = tint + vec3f(pulse, pulse * 0.7, pulse * 0.35);

  return vec4f(color, 1.0);
}
