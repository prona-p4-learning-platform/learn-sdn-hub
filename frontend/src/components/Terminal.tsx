import { useLayoutEffect, useMemo } from "react";
import { AttachAddon } from "xterm-addon-attach";
import { FitAddon } from "xterm-addon-fit";
import { SerializeAddon } from "xterm-addon-serialize";
import type { Terminal } from "xterm";

import XTerm from "./XTerm";
import createWebSocket from "../api/WebSocket";
import { useAuthStore } from "../stores/authStore";

interface TerminalProps {
  wsEndpoint: string;
  terminalState: string | undefined;
  onTerminalUnmount: (wsEndpoint: string, serializedState: string) => void;
}

function sendResize(websocket: WebSocket, fitAddon: FitAddon): void {
  if (websocket.readyState === 1) {
    // signal window resize to ssh using SIGWINCH (\x1B[8;25;80t)
    // running "resize" manually in the shell also fixes ncurses, tmux, screen etc. dimensions
    const dimensions = fitAddon.proposeDimensions();

    if (dimensions) {
      websocket.send("\x1B[8;" + dimensions.rows + ";" + dimensions.cols + "t");
    }
  }
}

export default function XTerminal(props: TerminalProps): JSX.Element {
  const { token } = useAuthStore();
  const { terminalState, wsEndpoint, onTerminalUnmount } = props;
  const serAddon = useMemo(() => {
    return new SerializeAddon();
  }, []);
  const fitAddon = useMemo(() => {
    return new FitAddon();
  }, []);

  let terminalRef: Terminal | null = null;

  const getTerminal = (terminal: Terminal | null) => {
    terminalRef = terminal;
  };

  // componentDidMount
  useLayoutEffect(() => {
    const websocket = createWebSocket(wsEndpoint);
    let resizeInterval: NodeJS.Timeout | undefined = undefined;

    let unmounted = false;
    let socketOpen = false;
    websocket.onopen = () => {
      // close socket safely if component has already unmounted (strict mode)
      if (unmounted) {
        websocket.close();
        return;
      }

      websocket.send(`auth ${token}`);
      socketOpen = true;

      // if the terminal is still available -> attach websocket
      if (terminalRef) {
        const attachAddon = new AttachAddon(websocket);

        terminalRef.loadAddon(attachAddon);
        sendResize(websocket, fitAddon);
      } else {
        console.log(
          "Terminal: Could not attach websocket. No XTerm reference.",
        );
      }
    };

    if (terminalRef) {
      // add resize callback
      terminalRef.onResize(() => {
        sendResize(websocket, fitAddon);
      });

      // restore terminal state
      terminalRef.write(terminalState ?? "");
      // ESC[0m resets all styles and colors
      //terminalRef.write("\x1B[0m");
      // ESC[1C moves cursor one position to the right
      terminalRef.write("\x1B[1C");

      // resize terminal
      fitAddon.fit();

      // periodically resize terminal
      // TODO: watch div resize instead and debounce fit?
      resizeInterval = setInterval(() => {
        if (terminalRef) fitAddon.fit();
      }, 1000);
    } else {
      console.log(
        "Terminal: Resizing will not be handled. No XTerm reference.",
      );
    }

    // componentWillUnmount
    return () => {
      unmounted = true;

      // stop resizing
      if (resizeInterval) clearInterval(resizeInterval);

      // serialize terminal state and close websocket
      if (socketOpen) {
        const state = serAddon.serialize({ scrollback: 1000 });
        onTerminalUnmount(wsEndpoint, state);

        websocket.close();
      }
    };
  });

  return (
    <XTerm
      className="myXtermClass"
      onTerminal={getTerminal}
      addons={[fitAddon, serAddon]}
    />
  );
}
