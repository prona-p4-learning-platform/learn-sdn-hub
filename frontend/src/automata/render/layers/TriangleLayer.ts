// WebGPU smoke test layer, replaced by PresenceLayer in Stage 1 Task 8.

import type { FrameInfo, RenderLayer } from "../Renderer";
import shaderSource from "../shaders/triangle.wgsl?raw";

const UNIFORM_SIZE = 16;

export class TriangleLayer implements RenderLayer {
  private readonly pipeline: GPURenderPipeline;
  private readonly uniformBuffer: GPUBuffer;
  private readonly bindGroup: GPUBindGroup;
  private readonly uniformData = new Float32Array(UNIFORM_SIZE / 4);

  constructor(
    private readonly device: GPUDevice,
    format: GPUTextureFormat,
  ) {
    const module = device.createShaderModule({
      label: "triangle shader",
      code: shaderSource,
    });

    this.pipeline = device.createRenderPipeline({
      label: "triangle pipeline",
      layout: "auto",
      vertex: { module, entryPoint: "vs_main" },
      fragment: { module, entryPoint: "fs_main", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });

    this.uniformBuffer = device.createBuffer({
      label: "triangle uniforms",
      size: UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = device.createBindGroup({
      label: "triangle bind group",
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });
  }

  draw(pass: GPURenderPassEncoder, frame: FrameInfo): void {
    this.uniformData[0] = frame.width / frame.height;
    this.uniformData[1] = frame.time / 1000;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
  }

  destroy(): void {
    this.uniformBuffer.destroy();
  }
}
