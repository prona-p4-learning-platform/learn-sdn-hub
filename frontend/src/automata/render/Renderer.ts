// frame loop: one render pass per frame, drawn by a list of layers
// each pipeline (triangle now, players, terrain, entities, belt items later)
// is its own RenderLayer

import { syncCanvasSize, type GpuContext } from "./gpu";

export interface FrameInfo {
  width: number;
  height: number;
  time: number;
}

export interface RenderLayer {
  draw(pass: GPURenderPassEncoder, frame: FrameInfo): void;
  destroy(): void;
}

export class Renderer {
  private readonly layers: RenderLayer[] = [];
  private frameHandle: number | null = null;

  constructor(
    private readonly gpu: GpuContext,
    private readonly clearValue: GPUColor = { r: 0.1, g: 0.1, b: 0.1, a: 1 },
  ) { }

  addLayer(layer: RenderLayer): void {
    this.layers.push(layer);
  }

  start(): void {
    if (this.frameHandle === null) {
      this.frameHandle = requestAnimationFrame(this.frame);
    }
  }

  stop(): void {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
  }

  destroy(): void {
    this.stop();
    for (const layer of this.layers) layer.destroy();
    this.layers.length = 0;
  }

  private readonly frame = (time: number): void => {
    this.frameHandle = requestAnimationFrame(this.frame);
    this.render(time);
  };

  private render(time: number): void {
    const { device, context, canvas } = this.gpu;
    syncCanvasSize(this.gpu);
    const frameInfo: FrameInfo = {
      width: canvas.width,
      height: canvas.height,
      time,
    };

    const encoder = device.createCommandEncoder({ label: "frame" });
    const pass = encoder.beginRenderPass({
      label: "main pass",
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: this.clearValue,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    for (const layer of this.layers) layer.draw(pass, frameInfo);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }
}
