import { useGpuDevice } from "./hooks/useGpuDevice";
import { useHashPage } from "./hooks/useHashPage";
import { ComputePage } from "./pages/ComputePage";
import { TrianglePage } from "./pages/TrianglePage";

export function App() {
  const page = useHashPage();
  const { adapterStatus, device, deviceStatus, gpuError } = useGpuDevice();

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
