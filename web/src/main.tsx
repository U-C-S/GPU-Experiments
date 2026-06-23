import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import computeShaderSource from "./shaders/square-numbers.wgsl?raw";
import shaderSource from "./shaders/triangle.wgsl?raw";

type PageKey = "compute" | "triangle";

function getPageFromHash(): PageKey {
  return location.hash === "#triangle" ? "triangle" : "compute";
}

function App() {
  const [page, setPage] = useState<PageKey>(() => getPageFromHash());
  const [device, setDevice] = useState<GPUDevice | null>(null);
  const [adapterStatus, setAdapterStatus] = useState("Pending");
  const [deviceStatus, setDeviceStatus] = useState("Pending");
  const [gpuError, setGpuError] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => setPage(getPageFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function requestGpuDevice() {
      if (!("gpu" in navigator)) {
        const message = "WebGPU is unavailable in this browser.";
        setGpuError(message);
        setAdapterStatus("WebGPU support missing");
        return;
      }

      setAdapterStatus("Requesting GPU adapter");
      const adapter = await navigator.gpu.requestAdapter();

      if (cancelled) {
        return;
      }

      if (!adapter) {
        const message = "No GPU adapter was returned.";
        setGpuError(message);
        setAdapterStatus("No adapter found");
        return;
      }

      setAdapterStatus("Adapter ready");
      setDeviceStatus("Requesting logical device");
      const nextDevice = await adapter.requestDevice();

      if (cancelled) {
        return;
      }

      setDeviceStatus("Device ready");
      setDevice(nextDevice);
    }

    requestGpuDevice().catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unknown WebGPU error";
      setGpuError(message);
      setDeviceStatus("Device request failed");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div>
          <h1 className="eyebrow">WebGPU samples</h1>
        </div>

        <nav>
          <a href="#compute" aria-current={page === "compute" ? "page" : false}>
            Compute shader
          </a>
          <a
            href="#triangle"
            aria-current={page === "triangle" ? "page" : false}
          >
            Triangle render
          </a>
        </nav>
      </aside>

      <main className="layout">
        {page === "compute" ? (
          <ComputePage device={device} gpuError={gpuError} />
        ) : (
          <TrianglePage
            adapterStatus={adapterStatus}
            device={device}
            deviceStatus={deviceStatus}
            gpuError={gpuError}
          />
        )}
      </main>
    </div>
  );
}

type ComputePageProps = {
  device: GPUDevice | null;
  gpuError: string | null;
};

function ComputePage({ device, gpuError }: ComputePageProps) {
  const [inputText, setInputText] = useState("Waiting...");
  const [outputText, setOutputText] = useState("Waiting...");
  const [status, setStatus] = useState("Waiting for GPU device");

  useEffect(() => {
    if (gpuError) {
      setStatus(gpuError);
      return;
    }

    if (!device) {
      return;
    }

    const gpuDevice = device;
    let cancelled = false;

    async function runComputeSample() {
      const input = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const bufferSize = input.byteLength;

      setInputText(Array.from(input).join(", "));
      setStatus("Compiling compute WGSL");

      const shaderModule = gpuDevice.createShaderModule({
        code: computeShaderSource,
      });
      const pipeline = gpuDevice.createComputePipeline({
        layout: "auto",
        compute: {
          module: shaderModule,
          entryPoint: "squareNumbers",
        },
      });

      const storageBuffer = gpuDevice.createBuffer({
        size: bufferSize,
        usage:
          GPUBufferUsage.STORAGE |
          GPUBufferUsage.COPY_DST |
          GPUBufferUsage.COPY_SRC,
      });
      const readBuffer = gpuDevice.createBuffer({
        size: bufferSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      gpuDevice.queue.writeBuffer(storageBuffer, 0, input);

      const bindGroup = gpuDevice.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: {
              buffer: storageBuffer,
            },
          },
        ],
      });

      setStatus("Dispatching GPU work");

      const commandEncoder = gpuDevice.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(input.length);
      passEncoder.end();
      commandEncoder.copyBufferToBuffer(
        storageBuffer,
        0,
        readBuffer,
        0,
        bufferSize,
      );
      gpuDevice.queue.submit([commandEncoder.finish()]);

      await readBuffer.mapAsync(GPUMapMode.READ);
      const result = new Float32Array(readBuffer.getMappedRange().slice(0));
      readBuffer.unmap();

      if (!cancelled) {
        setOutputText(Array.from(result).join(", "));
        setStatus("Complete");
      }
    }

    runComputeSample().catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Compute sample failed";
      setStatus(message);
    });

    return () => {
      cancelled = true;
    };
  }, [device, gpuError]);

  return (
    <section className="page compute-panel">
      <div>
        <p className="eyebrow">Compute shader</p>
        <h2 id="compute-title">Square a list on the GPU.</h2>
        <p className="lede">
          A storage buffer starts with eight numbers. The compute pass runs one
          invocation per number, writes the square back, and maps a read buffer
          so JavaScript can print the result.
        </p>
      </div>

      <div className="compute-grid">
        <DataCell label="Input buffer" value={inputText} />
        <DataCell label="Output buffer" value={outputText} />
        <DataCell label="Compute status" value={status} />
      </div>
    </section>
  );
}

type TrianglePageProps = {
  adapterStatus: string;
  device: GPUDevice | null;
  deviceStatus: string;
  gpuError: string | null;
};

function TrianglePage({
  adapterStatus,
  device,
  deviceStatus,
  gpuError,
}: TrianglePageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [accent, setAccent] = useState(35);
  const accentRef = useRef(accent);
  const [rendererStatus, setRendererStatus] = useState(
    "Waiting for GPU device",
  );
  const [shaderStatus, setShaderStatus] = useState("Pending");
  const [frameStatus, setFrameStatus] = useState("Pending");

  useEffect(() => {
    accentRef.current = accent;
  }, [accent]);

  useEffect(() => {
    if (gpuError) {
      setRendererStatus(gpuError);
      setShaderStatus("Renderer unavailable");
      setFrameStatus("Renderer unavailable");
      return;
    }

    if (!device || !canvasRef.current) {
      setRendererStatus("Waiting for GPU device");
      return;
    }

    const gpuDevice = device;
    let animationFrameId = 0;
    let cancelled = false;
    const canvas = canvasRef.current;
    const context = canvas.getContext("webgpu");

    if (!context) {
      setRendererStatus("The canvas could not create a WebGPU context.");
      return;
    }
    const gpuContext = context;

    const format = navigator.gpu.getPreferredCanvasFormat();
    gpuContext.configure({
      device: gpuDevice,
      format,
      alphaMode: "premultiplied",
      colorSpace: "display-p3",
    });

    setRendererStatus("Compiling WGSL shader");
    setShaderStatus("Creating shader module");

    const uniformData = new Float32Array(4);
    const shaderModule = gpuDevice.createShaderModule({ code: shaderSource });
    const uniformBuffer = gpuDevice.createBuffer({
      size: uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const pipeline = gpuDevice.createRenderPipeline({
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
    const bindGroup = gpuDevice.createBindGroup({
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
      uniformData[3] = accentRef.current / 100;

      gpuDevice.queue.writeBuffer(uniformBuffer, 0, uniformData);

      const commandEncoder = gpuDevice.createCommandEncoder();
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

      gpuDevice.queue.submit([commandEncoder.finish()]);
      animationFrameId = requestAnimationFrame(frame);
    }

    setShaderStatus("WGSL compiled");
    setFrameStatus("Animating");
    setRendererStatus("Rendering");
    animationFrameId = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [device, gpuError]);

  return (
    <section className="page">
      <section className="hero">
        <p className="eyebrow">Render pipeline</p>
        <h2 id="triangle-title">Animated triangle</h2>
        <p className="lede">
          This sample requests a device, compiles WGSL, binds a uniform buffer,
          and redraws an animated triangle every frame.
        </p>

        <div className="controls">
          <label className="control" htmlFor="accent">
            <span>Accent</span>
            <input
              id="accent"
              type="range"
              min="0"
              max="100"
              value={accent}
              onChange={(event) => setAccent(Number(event.target.value))}
            />
          </label>
          <div className="status-card">
            <span className="status-label">Renderer status</span>
            <strong>{rendererStatus}</strong>
          </div>
        </div>
      </section>

      <section className="canvas-panel">
        <canvas id="gpu-canvas" ref={canvasRef} />
      </section>

      <section className="guide">
        <Step index="01" title="Get an adapter" status={adapterStatus}>
          Ask the browser for a GPU backend that your machine can use.
        </Step>
        <Step index="02" title="Create a device" status={deviceStatus}>
          The device allocates buffers, pipelines, and command encoders.
        </Step>
        <Step index="03" title="Compile WGSL" status={shaderStatus}>
          The shader transforms vertices and shades pixels on the GPU.
        </Step>
        <Step index="04" title="Render frames" status={frameStatus}>
          Each frame updates a tiny uniform buffer and submits one pass.
        </Step>
      </section>
    </section>
  );
}

type DataCellProps = {
  label: string;
  value: string;
};

function DataCell({ label, value }: DataCellProps) {
  return (
    <div className="compute-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type StepProps = {
  children: string;
  index: string;
  status: string;
  title: string;
};

function Step({ children, index, status, title }: StepProps) {
  return (
    <article className="step">
      <span className="step-index">{index}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
        <strong>{status}</strong>
      </div>
    </article>
  );
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

const rootElement = document.querySelector("#root");

if (!rootElement) {
  throw new Error("Missing root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
