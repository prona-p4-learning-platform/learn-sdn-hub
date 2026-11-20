import { Alert, AlertTitle } from "@mui/material";

interface NoWebGpuProps {
  reason: string;
}

export default function NoWebGpu({ reason }: NoWebGpuProps): JSX.Element {
  return (
    <Alert severity="error" sx={{ maxWidth: 640 }}>
      <AlertTitle>WebGPU is not available</AlertTitle>
      {reason}
      <br />
      The game needs a browser with WebGPU enabled, e.g. a current Chrome, Edge,
      Safari or Firefox. On Linux, WebGPU may have to be enabled in the browser
      settings or flags first.
    </Alert>
  );
}
