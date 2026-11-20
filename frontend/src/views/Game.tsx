import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

import { configureCanvas, requestGpuDevice } from "../automata/render/gpu";
import { Renderer } from "../automata/render/Renderer";
import { TriangleLayer } from "../automata/render/layers/TriangleLayer";
import NoWebGpu from "../automata/ui/NoWebGpu";

// route /game/:assignment: the assignment parameter is used once the start
// screen and world connection exist (Stage 1 Task 8)
function Game(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let dispose: (() => void) | undefined;

    void requestGpuDevice().then((result) => {
      if (!result.ok) {
        if (!disposed) setError(result.reason);
        return;
      }
      const { device } = result;

      if (disposed) {
        device.destroy();
        return;
      }

      const gpu = configureCanvas(canvas, device);
      if (!gpu) {
        device.destroy();
        setError("The canvas could not create a WebGPU context.");
        return;
      }

      const renderer = new Renderer(gpu);
      renderer.addLayer(new TriangleLayer(device, gpu.format));

      void device.lost.then((info) => {
        if (info.reason === "destroyed") return; // own cleanup
        renderer.stop();
        setError(`The GPU device was lost: ${info.message}`);
      });

      renderer.start();

      dispose = () => {
        renderer.destroy();
        gpu.context.unconfigure();
        device.destroy();
      };
    });

    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        height: { xs: "calc(100vh - 56px)", sm: "calc(100vh - 64px)" },
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      {error && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <NoWebGpu reason={error} />
        </Box>
      )}
    </Box>
  );
}

export const Component = Game;
export default Game;
