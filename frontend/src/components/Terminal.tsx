import React from "react";
import { AttachAddon } from "xterm-addon-attach";
import { XTerm } from 'xterm-for-react'
import createWebSocket from '../api/WebSocket'
interface TerminalProps {
  wsEndpoint: string;
}

export default class XTerminal extends React.Component<TerminalProps> {
  private websocket!: WebSocket;
  private resizeTimer !: NodeJS.Timeout
  constructor(props: TerminalProps) {
    super(props);
    this.handleTermRef = this.handleTermRef.bind(this)
    this.websocket = createWebSocket(this.props.wsEndpoint);
  }

  handleTermRef(instance: XTerm |null):void{

    this.resizeTimer = setInterval(() => {
      instance?.terminal.resize(instance.terminal.cols,instance.terminal.rows)
    },200)
  }

  componentDidMount(){
    this.websocket.onopen = (e) => {
      console.log((e.target as WebSocket).readyState)
      if ((e.target as WebSocket).readyState !== WebSocket.OPEN) return;
      this.websocket.send(`auth ${ localStorage.getItem("token")}` )
    }    
  }

  componentWillUnmount(){
    if (this.resizeTimer){
    clearTimeout(this.resizeTimer)
  }
  }
  
  render() {

    const attachAddon = new AttachAddon(this.websocket);
    return (
      <div style={{width:200, height: 200}}>
        <XTerm ref={this.handleTermRef} addons={[attachAddon]}  />
      </div>
    );
  }
}
