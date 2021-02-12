import React from "react";
import { Box } from "@material-ui/core";
import { AttachAddon } from "xterm-addon-attach";
import { FitAddon } from "xterm-addon-fit";
import { XTerm } from 'xterm-for-react'
import createWebSocket from '../api/WebSocket'
interface TerminalProps {
  wsEndpoint: string;
}

export default class XTerminal extends React.Component<TerminalProps> {
  private websocket!: WebSocket;
  private resizeTimer !: NodeJS.Timeout;
  private attachAddon;
  private fitAddon;

  constructor(props: TerminalProps) {
    super(props);
    this.handleTermRef = this.handleTermRef.bind(this)
    this.websocket = createWebSocket(this.props.wsEndpoint);
    this.attachAddon = new AttachAddon(this.websocket);
    this.fitAddon = new FitAddon();
  }

  handleTermRef(instance: XTerm | null): void {
    this.resizeTimer = setInterval(() => {
      this.fitAddon.fit()
      //instance?.terminal.resize(instance.terminal.cols,instance.terminal.rows)
      //instance?.terminal.resize(this.fitAddon.proposeDimensions().cols,this.fitAddon.proposeDimensions().rows)
    }, 200)
  }

  componentDidMount() {
    this.websocket.onopen = (e) => {
      console.log((e.target as WebSocket).readyState)
      if ((e.target as WebSocket).readyState !== WebSocket.OPEN) return;
      this.websocket.send(`auth ${localStorage.getItem("token")}`)
    }
    console.log("proposed terminal size cols: " + this.fitAddon.proposeDimensions().cols + " rows:" + this.fitAddon.proposeDimensions().rows)
    this.fitAddon.fit()
  }

  componentWillUnmount() {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer)
    }
    this.websocket.close()
  }

  render() {
    return (
      <Box style={{ height: '100%' }} aria-label="xterm-box">
        <XTerm ref={this.handleTermRef} addons={[this.fitAddon, this.attachAddon]} className="myXtermClass" />
      </Box>
    );
  }
}
