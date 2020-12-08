import React, { createRef } from "react";
import { Terminal } from "xterm";
import { AttachAddon } from "xterm-addon-attach";

interface TerminalProps {
  wsEndpoint: string;
}

export default class XTerminal extends React.Component<TerminalProps> {
  private terminalRef = createRef<HTMLDivElement>();
  private attachAddon!: AttachAddon;
  private term!: Terminal;
  private websocket!: WebSocket;

  constructor(props: TerminalProps) {
    super(props);
  }

  componentDidMount() {
    this.connectWS();
  }

  connectWS() {
    if (this.terminalRef.current !== null){
      this.websocket = new WebSocket(this.props.wsEndpoint);
      this.term = new Terminal();
      this.term.open(this.terminalRef.current);
      this.attachAddon = new AttachAddon(this.websocket);
      this.attachAddon.activate(this.term);
    }
  }

  render() {
    return (
      <>
        <div ref={this.terminalRef} id="xterm"></div>
      </>
    );
  }
}
