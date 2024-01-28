import Guacamole from "guacamole-common-js";

/**
 * Guacamole Tunnel implemented over WebSocket Proxy.
 * Based on Guacamole WebSocket Tunnel (guacamole-common.js).
 */
export class GuacamoleProxyTunnel extends Guacamole.WebSocketTunnel {
    tunnel: GuacamoleProxyTunnel;
    socket?: WebSocket;
    receive_timeout: number | null = null;
    unstableTimeout: number | null = null;
    pingInterval?: ReturnType<typeof setInterval>;
    readonly PING_FREQUENCY: number = 500;
    onuuid?: Function;

    constructor(tunnelURL: string) {
        var ws_protocol: { [s: string]: string; } = {
            "http:": "ws:",
            "https:": "wss:"
        };

        // If not already a websocket URL
        if (tunnelURL.substring(0, 3) !== "ws:"
            && tunnelURL.substring(0, 4) !== "wss:") {

            var protocol = ws_protocol[window.location.protocol];

            // If absolute URL, convert to absolute WS URL
            if (tunnelURL.substring(0, 1) === "/")
                tunnelURL =
                    protocol
                    + "//" + window.location.host
                    + tunnelURL;

            // Otherwise, construct absolute from relative URL
            else {

                // Get path from pathname
                var slash = window.location.pathname.lastIndexOf("/");
                var path = window.location.pathname.substring(0, slash + 1);

                // Construct absolute URL
                tunnelURL =
                    protocol
                    + "//" + window.location.host
                    + path
                    + tunnelURL;

            }

        }

        super(tunnelURL);
        this.tunnel = this;

        this.sendMessage = function(_elements) {
            // Do not attempt to send messages if not connected
            if (!this.tunnel.isConnected())
                return;

            // Do not attempt to send empty messages
            if (arguments.length === 0)
                return;

            function getElement(value: any) {
                var string = String(value);
                return string.length + "." + string;
            }

            // Initialized message with first element
            var message = getElement(arguments[0]);

            // Append remaining elements
            for (var i = 1; i < arguments.length; i++)
                message += "," + getElement(arguments[i]);

            // Final terminator
            message += ";";

            this.socket?.send(message);
        };

        this.connect = function (_data) {
            this.reset_timeout();

            // Mark the tunnel as connecting
            this.tunnel.setState(Guacamole.Tunnel.State.CONNECTING);

            // Connect socket
            this.socket = new WebSocket(tunnelURL);

            this.socket.onopen = (event) => {
                if ((event.target as WebSocket).readyState !== WebSocket.OPEN) return;
                // Send authentication token to backend
                this.socket?.send(`auth ${localStorage.getItem("token")}`);

                this.reset_timeout();

                // Ping tunnel endpoint regularly to test connection stability
                this.pingInterval = setInterval(() => {
                    this.tunnel.sendMessage(Guacamole.Tunnel.INTERNAL_DATA_OPCODE,
                        "ping", new Date().getTime());
                }, this.PING_FREQUENCY);

            };

            this.socket.onclose = (event) => {
                // Pull status code directly from closure reason provided by Guacamole
                if (event.reason)
                    this.close_tunnel(new Guacamole.Status(parseInt(event.reason) as Guacamole.Status.Code, event.reason));

                // Failing that, derive a Guacamole status code from the WebSocket
                // status code provided by the browser
                else if (event.code)
                    this.close_tunnel(new Guacamole.Status(Guacamole.Status.Code.fromWebSocketCode(event.code)));

                // Otherwise, assume server is unreachable
                else
                    this.close_tunnel(new Guacamole.Status(Guacamole.Status.Code.UPSTREAM_NOT_FOUND));

            };

            this.socket.onmessage = (event) => {
                this.reset_timeout();

                var message = event.data;
                var startIndex = 0;
                // guacamole-common-js has this undefined, but needs to be set to -1 to work
                var elementEnd = -1;

                var elements = [];

                do {
                    // Search for end of length
                    var lengthEnd = message.indexOf(".", startIndex);
                    if (lengthEnd !== -1) {
                        // Parse length
                        var length = parseInt(message.substring(elementEnd + 1, lengthEnd));

                        // Calculate start of element
                        startIndex = lengthEnd + 1;

                        // Calculate location of element terminator
                        elementEnd = startIndex + length;
                    }

                    // If no period, incomplete instruction.
                    else
                        this.close_tunnel(new Guacamole.Status(Guacamole.Status.Code.SERVER_ERROR, "Incomplete instruction."));

                    // We now have enough data for the element. Parse.
                    var element = message.substring(startIndex, elementEnd);
                    var terminator = message.substring(elementEnd, elementEnd + 1);

                    // Add element to array
                    elements.push(element);

                    // If last element, handle instruction
                    if (terminator === ";") {

                        // Get opcode
                        var opcode = elements.shift();

                        // Update state and UUID when first instruction received
                        if (this.tunnel.uuid === null) {

                            // Associate tunnel UUID if received
                            if (opcode === Guacamole.Tunnel.INTERNAL_DATA_OPCODE)
                                this.tunnel.setUUID(elements[0]);

                            // Tunnel is now open and UUID is available
                            this.tunnel.setState(Guacamole.Tunnel.State.OPEN);

                        }

                        // Call instruction handler.
                        if (opcode !== Guacamole.Tunnel.INTERNAL_DATA_OPCODE && this.tunnel.oninstruction)
                            this.tunnel.oninstruction(opcode, elements);

                        // Clear elements
                        elements.length = 0;

                    }

                    // Start searching for length at character after
                    // element terminator
                    startIndex = elementEnd + 1;
                } while (startIndex < message.length);
            };

        };

        this.disconnect = () => {
            this.close_tunnel(new Guacamole.Status(Guacamole.Status.Code.SUCCESS, "Manually closed."));
        };
    }

    reset_timeout() {
        // Get rid of old timeouts (if any)
        if (this.receive_timeout !== null)
            window.clearTimeout(this.receive_timeout);
        if (this.unstableTimeout !== null)
            window.clearTimeout(this.unstableTimeout);

        // Clear unstable status
        if (this.tunnel.state === Guacamole.Tunnel.State.UNSTABLE) {
            this.tunnel.setState(Guacamole.Tunnel.State.OPEN);
        }

        // Set new timeout for tracking overall connection timeout
        this.receive_timeout = window.setTimeout(() => {
            this.close_tunnel(new Guacamole.Status(Guacamole.Status.Code.UPSTREAM_TIMEOUT, "Server timeout."));
        }, this.tunnel.receiveTimeout);

        // Set new timeout for tracking suspected connection instability
        this.unstableTimeout = window.setTimeout(() => {
            this.tunnel.setState(Guacamole.Tunnel.State.UNSTABLE);
        }, this.tunnel.unstableThreshold);
    }

    setState(state: any) {
        // Notify only if state changes
        if (state !== this.state) {
            this.state = state;
            if (this.onstatechange)
                this.onstatechange(state);
        }
    };

    setUUID(uuid: string) {
        this.uuid = uuid;
        if (this.onuuid)
            this.onuuid(uuid);
    };

    close_tunnel(status: Guacamole.Status) {
        // Get rid of old timeouts (if any)
        if (this.receive_timeout !== null)
            window.clearTimeout(this.receive_timeout);
        if (this.unstableTimeout !== null)
            window.clearTimeout(this.unstableTimeout);

        // Cease connection test pings
        window.clearInterval(this.pingInterval);

        // Ignore if already closed
        if (this.tunnel.state === Guacamole.Tunnel.State.CLOSED) {
            return;
        }

        // If connection closed abnormally, signal error.
        if (status.code !== Guacamole.Status.Code.SUCCESS && this.tunnel.onerror) {
            this.tunnel.onerror(status);
        }

        // Mark as closed
        this.tunnel.setState(Guacamole.Tunnel.State.CLOSED);

        this.socket?.close();
    }
}