import { useEffect, useRef, useState } from "react";
import { Step } from "../components/Step";
import { startTriangleSample } from "../triangleSample";

type TrianglePageProps = {
  adapterStatus: string;
  device: GPUDevice | null;
  deviceStatus: string;
  gpuError: string | null;
};

export function TrianglePage({
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

    return startTriangleSample({
      canvas: canvasRef.current,
      device,
      getAccent: () => accentRef.current,
      onFrameStatus: setFrameStatus,
      onRendererStatus: setRendererStatus,
      onShaderStatus: setShaderStatus,
    });
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
