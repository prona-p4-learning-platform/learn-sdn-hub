import { z } from "zod";

interface Variables {
  location: Location;
  yjs: Yjs;
}

interface Location {
  /** The location parsed from window.location */
  window: HostDetails & { wsProtocol: string };
  /** The location to use for backend access */
  backend: {
    /** The location parts modified by env */
    parts: HostDetails;
    /** The backend url modified by env */
    url: string;
    /** True if the backend url has been modified by env */
    isModified: boolean;
  };
  /** The location to use for websockets */
  websocket: {
    /** The location parts modified by env */
    parts: HostDetails;
    /** The websocket url modified by env */
    url: string;
  };
}

interface HostDetails {
  hostname: string;
  /** Might be empty - corresponds to 80 (http) or 443 (https) */
  port: string;
  /** E.g.: http/ws or https/wss */
  protocol: string;
}

interface Yjs {
  webrtc: {
    url: string;
  };
  websocket: {
    url: string;
  };
}

// --- DEFAULTS ---------------------------------------------------------------

const defaultLocation = {
  hostname: "localhost",
  protocol: "https:",
};

const defaultVariables = {
  VITE_BACKEND_HTTP_PORT: undefined,
  VITE_API_HOST: undefined,
  VITE_WS_HOST: undefined,
  VITE_YJS_WEBRTC_HOST: "localhost",
  VITE_YJS_WEBRTC_PORT: "4444",
  VITE_YJS_WEBSOCKET_HOST: "localhost",
  VITE_YJS_WEBSOCKET_PORT: "1234",
};

// --- VALIDATOR SCHEMAS ------------------------------------------------------

const emptyStringToDefault = (def: string) => {
  return (val: string) => (val === "" ? def : val);
};
const emptyStringToUndefined = (val: string) => (val === "" ? undefined : val);
const getWebsocketProtocol = (protocol: string) => {
  return protocol === "http:" ? "ws:" : "wss:";
};

const locationSchema = z
  .object({
    hostname: z
      .string()
      .transform(emptyStringToDefault(defaultLocation.hostname))
      .default(defaultLocation.hostname),
    port: z.string().default(""),
    protocol: z
      .string()
      .transform(emptyStringToDefault(defaultLocation.protocol))
      .default(defaultLocation.protocol),
  })
  .transform((location) => {
    return {
      ...location,
      wsProtocol: getWebsocketProtocol(location.protocol),
    };
  });

const variablesSchema = z.object({
  VITE_BACKEND_HTTP_PORT: z
    .string()
    .transform(emptyStringToUndefined)
    .optional(),
  VITE_API_HOST: z.string().url().optional(),
  VITE_WS_HOST: z.string().url().optional(),
  VITE_YJS_WEBRTC_HOST: z
    .string()
    .transform(emptyStringToDefault(defaultVariables.VITE_YJS_WEBRTC_HOST))
    .default(defaultVariables.VITE_YJS_WEBRTC_HOST),
  VITE_YJS_WEBRTC_PORT: z
    .string()
    .transform(emptyStringToDefault(defaultVariables.VITE_YJS_WEBRTC_PORT))
    .default(defaultVariables.VITE_YJS_WEBRTC_PORT),
  VITE_YJS_WEBSOCKET_HOST: z
    .string()
    .transform(emptyStringToDefault(defaultVariables.VITE_YJS_WEBSOCKET_HOST))
    .default(defaultVariables.VITE_YJS_WEBSOCKET_HOST),
  VITE_YJS_WEBSOCKET_PORT: z
    .string()
    .transform(emptyStringToDefault(defaultVariables.VITE_YJS_WEBSOCKET_PORT))
    .default(defaultVariables.VITE_YJS_WEBSOCKET_PORT),
});

// --- VALIDATE & CONSTRUCT ---------------------------------------------------

// parse and validate
const validatedLocation = locationSchema.parse(window.location);
const validatedVariables = variablesSchema.parse(import.meta.env);

// --- BACKEND PART -----------------------------------------------------------

// construct backend env location
const backendModified = {
  hostname: validatedLocation.hostname,
  port: validatedLocation.port,
  protocol: validatedLocation.protocol,
};

if (validatedVariables.VITE_API_HOST) {
  const url = new URL(validatedVariables.VITE_API_HOST);

  backendModified.hostname = url.hostname;
  backendModified.protocol = url.protocol;
  backendModified.port = url.port;
} else if (validatedVariables.VITE_BACKEND_HTTP_PORT) {
  backendModified.port = validatedVariables.VITE_BACKEND_HTTP_PORT;
}

// construct backend url
let backendURL = `${backendModified.protocol}//${backendModified.hostname}`;
if (backendModified.port) {
  backendURL += `:${backendModified.port}`;
}

// --- WEBSOCKET PART ---------------------------------------------------------

// construct websocket env location
const websocketModified = {
  hostname: validatedLocation.hostname,
  port: validatedLocation.port,
  protocol: validatedLocation.wsProtocol,
};

if (validatedVariables.VITE_WS_HOST) {
  const url = new URL(validatedVariables.VITE_WS_HOST);

  websocketModified.hostname = url.hostname;
  websocketModified.protocol = url.protocol;
  websocketModified.port = url.port;
} else if (validatedVariables.VITE_BACKEND_HTTP_PORT) {
  websocketModified.port = validatedVariables.VITE_BACKEND_HTTP_PORT;
}

// construct websocket url
let websocketURL = `${websocketModified.protocol}//${websocketModified.hostname}`;
if (websocketModified.port) {
  websocketURL += `:${websocketModified.port}`;
}

// --- CONSTRUCT LOCATION -----------------------------------------------------

const isModified =
  !!validatedVariables.VITE_API_HOST ||
  !!validatedVariables.VITE_BACKEND_HTTP_PORT;

const location: Location = {
  window: validatedLocation,
  backend: {
    parts: backendModified,
    url: backendURL,
    isModified,
  },
  websocket: {
    parts: websocketModified,
    url: websocketURL,
  },
};

// --- CONSTRUCT YJS ----------------------------------------------------------

// construct Yjs config
const websocketURLYjs = `${validatedLocation.wsProtocol}//${validatedVariables.VITE_YJS_WEBSOCKET_HOST}:${validatedVariables.VITE_YJS_WEBSOCKET_PORT}`;
const webrtcURLYjs = `${validatedLocation.wsProtocol}//${validatedVariables.VITE_YJS_WEBRTC_HOST}:${validatedVariables.VITE_YJS_WEBRTC_PORT}`;

const yjs: Yjs = {
  websocket: {
    url: websocketURLYjs,
  },
  webrtc: {
    url: webrtcURLYjs,
  },
};

// --- MERGE & EXPORT ---------------------------------------------------------

const variables: Variables = {
  location,
  yjs,
};

console.log(variables);

export { variables };
