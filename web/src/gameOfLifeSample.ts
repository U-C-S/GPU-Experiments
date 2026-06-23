import shaderSource from "./shaders/game-of-life.wgsl?raw";
import { resizeCanvasToDisplaySize } from "./utils/canvas";

const gridWidth = 96;
const gridHeight = 64;
const cellCount = gridWidth * gridHeight;
const simulationStepMs = 90;

type GameOfLifeOptions = {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  onGeneration: (generation: number) => void;
  onStatus: (status: string) => void;
};

export function startGameOfLifeSample({
  canvas,
  device,
  onGeneration,
  onStatus,
}: GameOfLifeOptions) {
  let animationFrameId = 0;
  let cancelled = false;
  let currentBufferIndex = 0;
  let generation = 0;
  let lastStepAt = 0;

  const context = canvas.getContext("webgpu");

  if (!context) {
    onStatus("The canvas could not create a WebGPU context.");
    return () => {};
  }
  const gpuContext = context;

  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuContext.configure({
    device,
    format,
    alphaMode: "premultiplied",
    colorSpace: "display-p3",
  });

  onStatus("Creating simulation buffers");

  const gridSizeData = new Uint32Array([gridWidth, gridHeight]);
  const gridSizeBuffer = device.createBuffer({
    size: gridSizeData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(gridSizeBuffer, 0, gridSizeData);

  const initialCells = createInitialCells();
  const firstCellBuffer = createCellBuffer(device, initialCells);
  const secondCellBuffer = createCellBuffer(device, new Uint32Array(cellCount));
  const cellBuffers = [firstCellBuffer, secondCellBuffer] as const;

  onStatus("Compiling Game of Life WGSL");

  const shaderModule = device.createShaderModule({ code: shaderSource });
  const computePipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module: shaderModule,
      entryPoint: "computeLife",
    },
  });
  const renderPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vertexLife",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentLife",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  const computeBindGroups = [
    createComputeBindGroup(device, computePipeline, gridSizeBuffer, firstCellBuffer, secondCellBuffer),
    createComputeBindGroup(device, computePipeline, gridSizeBuffer, secondCellBuffer, firstCellBuffer),
  ] as const;
  const renderBindGroups = [
    createRenderBindGroup(device, renderPipeline, gridSizeBuffer, firstCellBuffer),
    createRenderBindGroup(device, renderPipeline, gridSizeBuffer, secondCellBuffer),
  ] as const;

  function frame(now: number) {
    if (cancelled) {
      return;
    }

    resizeCanvasToDisplaySize(canvas);

    const shouldStep = now - lastStepAt >= simulationStepMs;
    const commandEncoder = device.createCommandEncoder();

    if (shouldStep) {
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, computeBindGroups[currentBufferIndex]);
      passEncoder.dispatchWorkgroups(
        Math.ceil(gridWidth / 8),
        Math.ceil(gridHeight / 8),
      );
      passEncoder.end();

      currentBufferIndex = currentBufferIndex === 0 ? 1 : 0;
      generation += 1;
      lastStepAt = now;
      onGeneration(generation);
    }

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: gpuContext.getCurrentTexture().createView(),
          loadOp: "clear",
          clearValue: { r: 0.015, g: 0.018, b: 0.02, a: 1 },
          storeOp: "store",
        },
      ],
    });
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBindGroups[currentBufferIndex]);
    renderPass.draw(6, cellCount);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
    animationFrameId = requestAnimationFrame(frame);
  }

  onGeneration(0);
  onStatus("Running");
  animationFrameId = requestAnimationFrame(frame);

  return () => {
    cancelled = true;
    cancelAnimationFrame(animationFrameId);
  };
}

function createCellBuffer(device: GPUDevice, initialData: Uint32Array) {
  const buffer = device.createBuffer({
    size: initialData.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });

  device.queue.writeBuffer(buffer, 0, initialData);
  return buffer;
}

function createInitialCells() {
  const cells = new Uint32Array(cellCount);

  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const isAlive = noise - Math.floor(noise) > 0.72;
      cells[y * gridWidth + x] = isAlive ? 1 : 0;
    }
  }

  seedGlider(cells, 8, 8);
  seedGlider(cells, 62, 30);
  seedBlinker(cells, 42, 18);
  seedBlinker(cells, 24, 44);

  return cells;
}

function seedGlider(cells: Uint32Array, x: number, y: number) {
  setCell(cells, x + 1, y, 1);
  setCell(cells, x + 2, y + 1, 1);
  setCell(cells, x, y + 2, 1);
  setCell(cells, x + 1, y + 2, 1);
  setCell(cells, x + 2, y + 2, 1);
}

function seedBlinker(cells: Uint32Array, x: number, y: number) {
  setCell(cells, x, y, 1);
  setCell(cells, x + 1, y, 1);
  setCell(cells, x + 2, y, 1);
}

function setCell(cells: Uint32Array, x: number, y: number, value: number) {
  cells[y * gridWidth + x] = value;
}

function createComputeBindGroup(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  gridSizeBuffer: GPUBuffer,
  inputBuffer: GPUBuffer,
  outputBuffer: GPUBuffer,
) {
  return device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: { buffer: gridSizeBuffer },
      },
      {
        binding: 1,
        resource: { buffer: inputBuffer },
      },
      {
        binding: 2,
        resource: { buffer: outputBuffer },
      },
    ],
  });
}

function createRenderBindGroup(
  device: GPUDevice,
  pipeline: GPURenderPipeline,
  gridSizeBuffer: GPUBuffer,
  cellBuffer: GPUBuffer,
) {
  return device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: { buffer: gridSizeBuffer },
      },
      {
        binding: 1,
        resource: { buffer: cellBuffer },
      },
    ],
  });
}
