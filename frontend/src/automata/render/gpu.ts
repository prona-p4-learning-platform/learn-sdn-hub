// WebGPU setup shared by every render layer

export interface GpuContext {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  canvas: HTMLCanvasElement;
}

export type GpuDeviceResult =
  { ok: true; device: GPUDevice } | { ok: false; reason: string };

export function isWebGpuAvailable(): boolean {
  return "gpu" in navigator;
}

export async function requestGpuDevice(): Promise<GpuDeviceResult> {
  if (!isWebGpuAvailable()) {
    return {
      ok: false,
      reason:
        "This browser does not provide WebGPU (navigator.gpu is missing).",
    };
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    return {
      ok: false,
      reason:
        "No suitable GPU adapter was found. WebGPU may be disabled in this browser, or the GPU/driver is not supported.",
    };
  }

  try {
    return { ok: true, device: await adapter.requestDevice() };
  } catch (error) {
    return {
      ok: false,
      reason: `Requesting a GPU device failed: ${String(error)}`,
    };
  }
}

export function configureCanvas(
  canvas: HTMLCanvasElement,
  device: GPUDevice,
): GpuContext | null {
  const context = canvas.getContext("webgpu");
  if (!context) return null;

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });

  return { device, context, format, canvas };
}

export function syncCanvasSize(gpu: GpuContext): boolean {
  const { canvas, device } = gpu;
  const maxSize = device.limits.maxTextureDimension2D;
  const clamp = (value: number) => Math.max(1, Math.min(value, maxSize));

  const rect = canvas.getBoundingClientRect();
  const width = clamp(Math.round(rect.width * window.devicePixelRatio));
  const height = clamp(Math.round(rect.height * window.devicePixelRatio));

  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}
