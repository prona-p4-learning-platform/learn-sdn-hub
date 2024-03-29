const hostname = window?.location?.hostname ?? "localhost";
const port = import.meta.env.VITE_REACT_APP_BACKEND_HTTP_PORT ?? window?.location?.port ?? "3001";
const protocol = window?.location?.protocol ?? "http";
const backendURL = import.meta.env.VITE_REACT_APP_API_HOST ?? `${protocol}//${hostname}:${port}`;
const wsProtocol = protocol === "http:" ? "ws:": "wss:"
const wsBackendHost = import.meta.env.VITE_REACT_APP_WS_HOST ?? `${wsProtocol}//${hostname}:${port}`;

const config = {
    backendURL,
    wsBackendHost
}

export default config;
