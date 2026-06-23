import computeShaderSource from "./shaders/square-numbers.wgsl?raw";

type ComputeSampleResult = {
  input: number[];
  output: number[];
};

export async function runComputeSample(
  device: GPUDevice,
  onStatus: (status: string) => void,
): Promise<ComputeSampleResult> {
  const input = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const bufferSize = input.byteLength;

  onStatus("Compiling compute WGSL");

  const shaderModule = device.createShaderModule({
    code: computeShaderSource,
  });
  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module: shaderModule,
      entryPoint: "squareNumbers",
    },
  });

  const storageBuffer = device.createBuffer({
    size: bufferSize,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });
  const readBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  device.queue.writeBuffer(storageBuffer, 0, input);

  const bindGroup = device.createBindGroup({
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

  onStatus("Dispatching GPU work");

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatchWorkgroups(input.length);
  passEncoder.end();
  commandEncoder.copyBufferToBuffer(storageBuffer, 0, readBuffer, 0, bufferSize);
  device.queue.submit([commandEncoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const output = new Float32Array(readBuffer.getMappedRange().slice(0));
  readBuffer.unmap();

  return {
    input: Array.from(input),
    output: Array.from(output),
  };
}
