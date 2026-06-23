import { useEffect, useState } from "react";

export function useGpuDevice() {
  const [device, setDevice] = useState<GPUDevice | null>(null);
  const [adapterStatus, setAdapterStatus] = useState("Pending");
  const [deviceStatus, setDeviceStatus] = useState("Pending");
  const [gpuError, setGpuError] = useState<string | null>(null);

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

  return {
    adapterStatus,
    device,
    deviceStatus,
    gpuError,
  };
}
