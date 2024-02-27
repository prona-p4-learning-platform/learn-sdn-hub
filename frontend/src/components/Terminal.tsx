import React from "react";
import { AttachAddon } from "xterm-addon-attach";
import { FitAddon } from "xterm-addon-fit";
import { SerializeAddon } from "xterm-addon-serialize";

import XTerm from "./XTerm";
import createWebSocket from "../api/WebSocket";

interface TerminalProps {
  wsEndpoint: string;
  terminalState: string | undefined;
  onTerminalUnmount: (wsEndpoint: string, serializedState: string) => void;
}

export default class XTerminal extends React.Component<TerminalProps> {
  private websocket!: WebSocket;
  private resizeTimer!: NodeJS.Timeout;
  private attachAddon;
  private fitAddon;
  private serializeAddon;
  private xterm: XTerm | undefined;

  constructor(props: TerminalProps) {
    super(props);
    this.handleTermRef = this.handleTermRef.bind(this);
    this.websocket = createWebSocket(this.props.wsEndpoint);
    this.attachAddon = new AttachAddon(this.websocket);
    this.fitAddon = new FitAddon();
    this.serializeAddon = new SerializeAddon();
  }

  handleTermRef(instance: XTerm | null): void {
    if (instance !== null) this.xterm = instance;
    this.resizeTimer = setInterval(() => {
      this.fitAddon.fit();
    }, 1000);
  }

  componentDidMount(): void {
    this.websocket.onopen = (e) => {
      if ((e.target as WebSocket).readyState !== WebSocket.OPEN) return;
      this.websocket.send(`auth ${localStorage.getItem("token")}`);
      //signal initial window resize to ssh using SIGWINCH (\x1B[8;25;80t)
      //running "resize" manually in the shell also fixes ncurses, tmux, screen etc. dimensions
      this.websocket.send(
        "\x1B[8;" +
          this.fitAddon.proposeDimensions().rows +
          ";" +
          this.fitAddon.proposeDimensions().cols +
          "t",
      );
    };
    this.xterm?.terminal.onResize((_size) => {
      this.fitAddon.fit();
      if (this.websocket?.readyState === 1) {
        //signal window resize to ssh using SIGWINCH (\x1B[8;25;80t)
        //running "resize" manually in the shell also fixes ncurses, tmux, screen etc. dimensions
        this.websocket?.send(
          "\x1B[8;" +
            this.fitAddon.proposeDimensions().rows +
            ";" +
            this.fitAddon.proposeDimensions().cols +
            "t",
        );
      }
    });
    this.xterm?.terminal.write(this.props?.terminalState ?? "");
    // make sure background and foreground color are reset to default after restoring terminal state
    this.xterm?.terminal.write("\x1B[0m");
    this.xterm?.terminal.focus();
    this.fitAddon.fit();
  }

  componentWillUnmount(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    // limit serialized scrollback to 1000 lines
    const serializedState = this.serializeAddon.serialize({ scrollback: 1000 });
    this.props.onTerminalUnmount(this.props.wsEndpoint, serializedState);
    console.log("Terminal will unmount...");
    this.websocket.close();
  }

  render(): JSX.Element {
    return (
      <XTerm
        ref={this.handleTermRef.bind(this)}
        addons={[this.fitAddon, this.attachAddon, this.serializeAddon]}
        className="myXtermClass"
      />
    );
  }
}
