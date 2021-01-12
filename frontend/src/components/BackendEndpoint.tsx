function getHostAndPort() {
    const hostname = window?.location?.hostname ?? "localhost";
    const port = window?.location?.port ?? "3001";
    return hostname + ":" + port;
}

export function getBackendURL() {
    const protocol = window?.location?.protocol ?? "http";
    // if REACT_APP_API_HOST was set in env, use the defined URL, otherwise derive backend URL from current window.location in browser
    return process.env.REACT_APP_API_HOST ?? (protocol + "//" + getHostAndPort());
}

export function getWsBackendURL() {
    // if REACT_APP_WS_HOST was set in env, use the defined URL, otherwise derive backend URL from current window.location in browser
    return process.env.REACT_APP_WS_HOST ?? ("ws://" + getHostAndPort());
}

