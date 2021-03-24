import React from "react";
import { AttachAddon } from "xterm-addon-attach";
import { FitAddon } from "xterm-addon-fit";
import { SerializeAddon } from "xterm-addon-serialize";
import { XTerm } from 'xterm-for-react'
import createWebSocket from '../api/WebSocket'

interface TerminalProps {
  wsEndpoint: string;
  terminalState: string | undefined;
  onTerminalUnmount: Function;
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
    }, 1000)
  }

  componentDidMount() {
    this.websocket.onopen = (e) => {
      if ((e.target as WebSocket).readyState !== WebSocket.OPEN) return;
      this.websocket.send(`auth ${localStorage.getItem("token")}`);
      //signal initial window resize to ssh using SIGWINCH (\x1B[8;25;80t)
      //running "resize" manually in the shell also fixes ncurses, tmux, screen etc. dimensions
      this.websocket.send("\x1B[8;"+this.fitAddon.proposeDimensions().rows+";"+this.fitAddon.proposeDimensions().cols+"t");
    }
    this.xterm?.terminal.onResize((size) => {
      this.fitAddon.fit();
      if (this.websocket?.readyState === 1) {
        //signal window resize to ssh using SIGWINCH (\x1B[8;25;80t)
        //running "resize" manually in the shell also fixes ncurses, tmux, screen etc. dimensions
        this.websocket?.send("\x1B[8;"+this.fitAddon.proposeDimensions().rows+";"+this.fitAddon.proposeDimensions().cols+"t");
      }
    })
    this.xterm?.terminal.write( this.props?.terminalState ?? "" );
    // make sure background and foreground color are reset to default after restoring terminal state
    this.xterm?.terminal.write( "\x1B[0m" );
    this.xterm?.terminal.focus();
    this.fitAddon.fit();
  }

  componentWillUnmount() {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer)
    }
    // limit serialized scrollback to 1000 lines
    const serializedState = this.serializeAddon.serialize(1000)
    this.props.onTerminalUnmount(this.props.wsEndpoint, serializedState);
    this.websocket.close()
  }

  render() {
    return (
      <XTerm ref={this.handleTermRef} addons={[this.fitAddon, this.attachAddon, this.serializeAddon]} className="myXtermClass" />
    );
  }
}
