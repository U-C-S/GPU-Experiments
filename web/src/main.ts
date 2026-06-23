import "./style.css";
import shaderSource from "./shaders/triangle.wgsl?raw";

type StepKey = "adapter" | "device" | "shader" | "frame";

function queryRequired<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

const canvas = queryRequired<HTMLCanvasElement>("#gpu-canvas");
const statusText = queryRequired<HTMLElement>("#status-text");
const accentSlider = queryRequired<HTMLInputElement>("#accent");
const stepLabels: Record<StepKey, HTMLElement | null> = {
  adapter: document.querySelector("#step-adapter"),
  device: document.querySelector("#step-device"),
  shader: document.querySelector("#step-shader"),
  frame: document.querySelector("#step-frame"),
};

const uniformData = new Float32Array(4);

function setStatus(message: string) {
  statusText.textContent = message;
}

function setStep(step: StepKey, message: string) {
  const label = stepLabels[step];
  if (label) {
    label.textContent = message;
  }
}

function resizeCanvasToDisplaySize(target: HTMLCanvasElement) {
  const width = Math.max(
    1,
    Math.floor(target.clientWidth * window.devicePixelRatio),
  );
  const height = Math.max(
    1,
    Math.floor(target.clientHeight * window.devicePixelRatio),
  );

  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
}

async function start() {
  if (!("gpu" in navigator)) {
    setStatus("WebGPU is unavailable in this browser.");
    setStep("adapter", "WebGPU support missing");
    return;
  }

  setStatus("Requesting adapter…");
  setStep("adapter", "Requesting GPU adapter");
  const adapter = await navigator.gpu.requestAdapter();

  if (!adapter) {
    setStatus("No adapter was returned.");
    setStep("adapter", "No adapter found");
    return;
  }

  setStep("adapter", "Adapter ready");
  setStatus("Creating device…");
  setStep("device", "Requesting logical device");
  const device = await adapter.requestDevice();
  setStep("device", "Device ready");

  const context = canvas.getContext("webgpu");
  if (!context) {
    setStatus("The canvas could not create a WebGPU context.");
    return;
  }
  const gpuContext = context;

  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuContext.configure({
    device,
    format,
    alphaMode: "premultiplied",
    colorSpace: "display-p3",
  });

  setStatus("Compiling WGSL shader…");
  setStep("shader", "Creating shader module");
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

  setStep("shader", "WGSL compiled");
  setStep("frame", "Animating");
  setStatus("Rendering");

  const startedAt = performance.now();

  function frame(now: number) {
    resizeCanvasToDisplaySize(canvas);

    uniformData[0] = (now - startedAt) / 1000;
    uniformData[1] = canvas.width;
    uniformData[2] = canvas.height;
    uniformData[3] = Number(accentSlider.value) / 100;

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
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

for (const step of Object.keys(stepLabels) as StepKey[]) {
  setStep(step, "Pending");
}

start().catch((error: unknown) => {
  console.error(error);
  const message =
    error instanceof Error ? error.message : "Unknown WebGPU error";
  setStatus(message);
  setStep("frame", "Renderer failed");
});
