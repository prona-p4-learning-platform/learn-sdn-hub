import React from "react";
import { AttachAddon } from "xterm-addon-attach";
import { XTerm } from 'xterm-for-react'

interface TerminalProps {
  wsEndpoint: string;
}

export default class XTerminal extends React.Component<TerminalProps> {
  private websocket!: WebSocket;
  private resizeTimer !: NodeJS.Timeout
  constructor(props: TerminalProps) {
    super(props);
    this.handleTermRef = this.handleTermRef.bind(this)
  }

  handleTermRef(instance: XTerm |null):void{
    this.resizeTimer = setInterval(() => {
      instance?.terminal.resize(instance.terminal.cols,instance.terminal.rows)
    },200)
  }

  componentWillUnmount(){
    if (this.resizeTimer){
    clearTimeout(this.resizeTimer)
  }
  }
  
  render() {
    this.websocket = new WebSocket(this.props.wsEndpoint);
    const attachAddon = new AttachAddon(this.websocket);
    return (
      <div style={{width:200, height: 200}}>
        <XTerm ref={this.handleTermRef} addons={[attachAddon]}  />
      </div>
    );
  }
}
