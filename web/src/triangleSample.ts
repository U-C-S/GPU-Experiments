import shaderSource from "./shaders/triangle.wgsl?raw";
import { resizeCanvasToDisplaySize } from "./utils/canvas";

type TriangleSampleOptions = {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  getAccent: () => number;
  onFrameStatus: (status: string) => void;
  onRendererStatus: (status: string) => void;
  onShaderStatus: (status: string) => void;
};

export function startTriangleSample({
  canvas,
  device,
  getAccent,
  onFrameStatus,
  onRendererStatus,
  onShaderStatus,
}: TriangleSampleOptions) {
  let animationFrameId = 0;
  let cancelled = false;
  const context = canvas.getContext("webgpu");

  if (!context) {
    onRendererStatus("The canvas could not create a WebGPU context.");
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

  onRendererStatus("Compiling WGSL shader");
  onShaderStatus("Creating shader module");

  const uniformData = new Float32Array(4);
  const shaderModule = device.createShaderModule({ code: shaderSource });
  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vsMain",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fsMain",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });
  const startedAt = performance.now();

  function frame(now: number) {
    if (cancelled) {
      return;
    }

    resizeCanvasToDisplaySize(canvas);

    uniformData[0] = (now - startedAt) / 1000;
    uniformData[1] = canvas.width;
    uniformData[2] = canvas.height;
    uniformData[3] = getAccent() / 100;

    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: gpuContext.getCurrentTexture().createView(),
          loadOp: "clear",
          clearValue: { r: 0.035, g: 0.04, b: 0.06, a: 1 },
          storeOp: "store",
        },
      ],
    });

    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(3);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    animationFrameId = requestAnimationFrame(frame);
  }

  onShaderStatus("WGSL compiled");
  onFrameStatus("Animating");
  onRendererStatus("Rendering");
  animationFrameId = requestAnimationFrame(frame);

  return () => {
    cancelled = true;
    cancelAnimationFrame(animationFrameId);
  };
}
