import os from "os";

/**
 * Gets the backend identifier consisting of host IP and port
 * This is used to distinguish between multiple backends using the same MongoDB database
 */
export function getBackendIdentifier(): string {
  let host = "0.0.0.0";
  let port = 3001;

  if (process.env.BACKEND_HTTP_HOST !== undefined) {
    host = process.env.BACKEND_HTTP_HOST;
  }

  if (process.env.BACKEND_HTTP_PORT !== undefined) {
    port = parseInt(process.env.BACKEND_HTTP_PORT);
  }

  // If host is 0.0.0.0, try to get the actual IP address
  if (host === "0.0.0.0") {
    const networkInterfaces = os.networkInterfaces();
    
    // Try to find the first non-loopback IPv4 address
    for (const interfaceName in networkInterfaces) {
      const addresses = networkInterfaces[interfaceName];
      if (addresses) {
        for (const address of addresses) {
          if (address.family === "IPv4" && !address.internal) {
            host = address.address;
            break;
          }
        }
        if (host !== "0.0.0.0") break;
      }
    }
    
    // If still 0.0.0.0, fall back to localhost
    if (host === "0.0.0.0") {
      host = "127.0.0.1";
    }
  }

  return `${host}:${port}`;
}
