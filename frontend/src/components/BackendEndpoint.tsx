import React from "react";

function getHostAndPort() {
    const hostname = window?.location?.hostname ?? "localhost";
    const port = window?.location?.port ?? "3001";

    return hostname + ":" + port;
}

function getBackendURL() {
    const protocol = window?.location?.protocol ?? "http";

    let backendURL = protocol + "//" + getHostAndPort();
    
    if (process.env.REACT_APP_API_HOST !== undefined) {
      backendURL = process.env.REACT_APP_API_HOST;
    }

    return backendURL;
}

function getWsBackendURL() {
    let wsBackendURL = "ws://" + getHostAndPort();
    
    if (process.env.REACT_APP_WS_HOST !== undefined) {
      wsBackendURL = process.env.REACT_APP_WS_HOST;
    }

    return wsBackendURL;
}

