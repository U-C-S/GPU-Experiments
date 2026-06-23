@group(0) @binding(0) var<storage, read_write> numbers: array<f32>;

@compute @workgroup_size(1)
fn squareNumbers(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  numbers[index] = numbers[index] * numbers[index];
}
