const env = import.meta.env
const hostname = window.location.hostname || "localhost";

// set port
const ENV_PORT = env.VITE_REACT_APP_BACKEND_HTTP_PORT as unknown;
const port =
  (typeof ENV_PORT === "string" ? ENV_PORT : undefined) ??
  (window.location.port || "3001");

// set backend url
const ENV_BACKEND_URL = env.VITE_REACT_APP_API_HOST as unknown;
const protocol = window.location.protocol || "http";
const backendURL =
  (typeof ENV_BACKEND_URL === "string" ? ENV_BACKEND_URL : undefined) ??
  `${protocol}//${hostname}:${port}`;

// set backend ws url
const ENV_BACKEND_WS = env.VITE_REACT_APP_WS_HOST as unknown;
const wsProtocol = protocol === "http:" ? "ws:" : "wss:";
const wsBackendHost =
  (typeof ENV_BACKEND_WS === "string" ? ENV_BACKEND_WS : undefined) ??
  `${wsProtocol}//${hostname}:${port}`;

const config = {
  backendURL,
  wsBackendHost,
  oidcConfig: {
    authority: env.VITE_OIDC_AUTHORITY as string ?? undefined,
    clientId: env.VITE_OIDC_CLIENT_ID as string ?? undefined,
    redirectUri: env.VITE_OIDC_REDIRECT_URI as string ?? undefined,
    postLogoutRedirectUri: env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI as string ?? undefined,
  }
};

export default config;
