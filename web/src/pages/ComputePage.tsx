import { useEffect, useState } from "react";
import { DataCell } from "../components/DataCell";
import { runComputeSample } from "../computeSample";

type ComputePageProps = {
  device: GPUDevice | null;
  gpuError: string | null;
};

export function ComputePage({ device, gpuError }: ComputePageProps) {
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

    let cancelled = false;

    runComputeSample(device, setStatus)
      .then(({ input, output }) => {
        if (cancelled) {
          return;
        }

        setInputText(input.join(", "));
        setOutputText(output.join(", "));
        setStatus("Complete");
      })
      .catch((error: unknown) => {
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
