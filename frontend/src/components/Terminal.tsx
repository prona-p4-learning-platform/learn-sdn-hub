import React from "react";
import { AttachAddon } from "xterm-addon-attach";
import { FitAddon } from "xterm-addon-fit";
import { SerializeAddon } from "xterm-addon-serialize";
import { XTerm } from 'xterm-for-react'
import createWebSocket from '../api/WebSocket'

interface TerminalProps {
  wsEndpoint: string;
  terminalState: string | undefined;
  onTerminalSerialization: Function;
}

export default class XTerminal extends React.Component<TerminalProps> {
  private websocket!: WebSocket;
  private resizeTimer !: NodeJS.Timeout;
  private attachAddon;
  private fitAddon;
  private serializeAddon;
  private xterm: XTerm | undefined;

  constructor(props: TerminalProps) {
    super(props);
    this.handleTermRef = this.handleTermRef.bind(this)
    this.websocket = createWebSocket(this.props.wsEndpoint);
    this.attachAddon = new AttachAddon(this.websocket);
    this.fitAddon = new FitAddon();
    this.serializeAddon = new SerializeAddon();
  }

  handleTermRef(instance: XTerm | null): void {
    if ( instance !== null ) this.xterm = instance;
    this.resizeTimer = setInterval(() => {
      this.fitAddon.fit()

      //maybe we need to find a way to also resize ncurses apps etc., 
      //bash resizes perfectly using fit however, e.g., using SIGWINCH?
      //this.websocket.send("\x1B[8;30;120t");
      //running "resize" manually in the shell also fixes ncurses, tmux, screen etc. dimensions for now
    }, 200)
  }

  componentDidMount() {
    this.websocket.onopen = (e) => {
      if ((e.target as WebSocket).readyState !== WebSocket.OPEN) return;
      this.websocket.send(`auth ${localStorage.getItem("token")}`)
    }
    this.xterm?.terminal.write( this.props?.terminalState ?? "" );
    console.log("proposed terminal size cols: " + this.fitAddon.proposeDimensions().cols + " rows:" + this.fitAddon.proposeDimensions().rows)
    this.fitAddon.fit()
  }

  componentWillUnmount() {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer)
    }
    const serializedState = this.serializeAddon.serialize()
    this.props.onTerminalSerialization(this.props.wsEndpoint, serializedState);
    this.websocket.close()
  }

  render() {
    return (
      <XTerm ref={this.handleTermRef} addons={[this.fitAddon, this.attachAddon, this.serializeAddon]} className="myXtermClass" />
    );
  }
}
