const hostname = window?.location?.hostname ?? "localhost";
const port = window?.location?.port ?? "3001";
const protocol = window?.location?.protocol ?? "http";
const backendURL = process.env.REACT_APP_API_HOST ?? `${protocol}://${hostname}:${port}`;
const wsProtocol = protocol === "http" ? "ws": "wss"
const wsBackendHost = process.env.REACT_APP_WS_HOST ?? `${wsProtocol}://${hostname}:${post}`;

export default {
    backendURL,
    wsBackendHost
}
