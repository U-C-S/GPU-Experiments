struct Grid {
  size: vec2u,
}

@group(0) @binding(0) var<uniform> grid: Grid;
@group(0) @binding(1) var<storage, read> cellsIn: array<u32>;
@group(0) @binding(2) var<storage, read_write> cellsOut: array<u32>;

fn cellIndex(cell: vec2u) -> u32 {
  return cell.y * grid.size.x + cell.x;
}

fn wrappedCell(cell: vec2i) -> vec2u {
  let width = i32(grid.size.x);
  let height = i32(grid.size.y);
  return vec2u(
    u32((cell.x + width) % width),
    u32((cell.y + height) % height)
  );
}

fn readCell(cell: vec2i) -> u32 {
  return cellsIn[cellIndex(wrappedCell(cell))];
}

@compute @workgroup_size(8, 8)
fn computeLife(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= grid.size.x || id.y >= grid.size.y) {
    return;
  }

  let cell = vec2i(id.xy);
  let aliveNeighbors =
    readCell(cell + vec2i(-1, -1)) +
    readCell(cell + vec2i(0, -1)) +
    readCell(cell + vec2i(1, -1)) +
    readCell(cell + vec2i(-1, 0)) +
    readCell(cell + vec2i(1, 0)) +
    readCell(cell + vec2i(-1, 1)) +
    readCell(cell + vec2i(0, 1)) +
    readCell(cell + vec2i(1, 1));

  let alive = readCell(cell);
  let survives = alive == 1u && (aliveNeighbors == 2u || aliveNeighbors == 3u);
  let isBorn = alive == 0u && aliveNeighbors == 3u;

  cellsOut[cellIndex(id.xy)] = select(0u, 1u, survives || isBorn);
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) alive: f32,
  @location(1) uv: vec2f,
}

@vertex
fn vertexLife(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  let corners = array<vec2f, 6>(
    vec2f(0.08, 0.08),
    vec2f(0.92, 0.08),
    vec2f(0.08, 0.92),
    vec2f(0.08, 0.92),
    vec2f(0.92, 0.08),
    vec2f(0.92, 0.92)
  );

  let cell = vec2u(instanceIndex % grid.size.x, instanceIndex / grid.size.x);
  let alive = f32(cellsIn[instanceIndex]);
  let corner = corners[vertexIndex];
  let normalized = (vec2f(cell) + corner) / vec2f(grid.size);
  let clip = normalized * 2.0 - vec2f(1.0, 1.0);

  var output: VertexOutput;
  output.position = vec4f(clip.x, -clip.y, 0.0, 1.0);
  output.alive = alive;
  output.uv = normalized;
  return output;
}

@fragment
fn fragmentLife(input: VertexOutput) -> @location(0) vec4f {
  if (input.alive < 0.5) {
    discard;
  }

  let color = vec3f(
    0.32 + input.uv.x * 0.42,
    0.92,
    0.76 + input.uv.y * 0.18
  );
  return vec4f(color, 1.0);
}
