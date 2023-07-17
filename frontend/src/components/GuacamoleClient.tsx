import React from "react";
//import Guacamole from "guacamole-common-js";
import createWebSocket from '../api/WebSocket'

interface GuacamoleClientProps {
  alias: string;
  environment: string;
  wsEndpoint: string;
}

export default class GuacamoleClient extends React.Component<GuacamoleClientProps> {
    private websocket!: WebSocket;
  
    constructor(props: GuacamoleClientProps) {
      super(props);

      this.websocket = createWebSocket(this.props.wsEndpoint);
    }
  
    componentDidMount() {
      this.websocket.onopen = (e) => {
        if ((e.target as WebSocket).readyState !== WebSocket.OPEN) return;
        this.websocket.send(`auth ${localStorage.getItem("token")}`);
      }
    }
  
    componentWillUnmount() {
      console.log("GuacamoleClient will unmount...")
      this.websocket.close()
    }
  
    render() {
      return (
        <div></div>
      );
    }
}  

/* 
let guaca = new Guacamole.Client(new Guacamole.WebSocketTunnel(webSocketFullUrl));
guaca.onerror = function (error) {
    alert(error);
};
guaca.connect();

// Disconnect on close
window.onunload = function () {
     guaca.disconnect();
}

let display = document.getElementById("display");
display.appendChild(guaca.getDisplay().getElement()); 
*/