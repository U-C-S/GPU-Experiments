import { useEffect, useRef, useState } from "react";
import { startGameOfLifeSample } from "../gameOfLifeSample";

type GameOfLifePageProps = {
  device: GPUDevice | null;
  gpuError: string | null;
};

export function GameOfLifePage({ device, gpuError }: GameOfLifePageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState("Waiting for GPU device");
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (gpuError) {
      setStatus(gpuError);
      return;
    }

    if (!device || !canvasRef.current) {
      setStatus("Waiting for GPU device");
      return;
    }

    return startGameOfLifeSample({
      canvas: canvasRef.current,
      device,
      onGeneration: setGeneration,
      onStatus: setStatus,
    });
  }, [device, gpuError]);

  return (
    <section className="page">
      <section className="hero life-hero">
        <p className="eyebrow">Compute + render</p>
        <h2>Conway's Game of Life</h2>
        <p className="lede">
          A compute shader evolves a 96 by 64 cell grid on the GPU. A render
          pipeline then draws the live cells from the same storage buffer.
        </p>

        <div className="controls">
          <div className="status-card">
            <span className="status-label">Simulation status</span>
            <strong>{status}</strong>
          </div>
          <div className="status-card">
            <span className="status-label">Generation</span>
            <strong>{generation}</strong>
          </div>
        </div>
      </section>

      <section className="canvas-panel life-panel">
        <canvas
          className="sample-canvas life-canvas"
          ref={canvasRef}
          aria-label="WebGPU Game of Life simulation"
        />
      </section>
    </section>
  );
}
