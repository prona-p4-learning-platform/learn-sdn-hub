import { useEffect, useLayoutEffect, useMemo } from "react";
import { FitAddon } from "xterm-addon-fit";
import { Terminal } from "xterm";
import XTerm from "./XTerm";
import TerminalObserver from "../utilities/TerminalObserver";

interface SubmissionTerminalProps {
  terminalState?: string;
  onTerminalReady: (terminal: Terminal) => void;
  terminalKey: string;
}

export default function SubmissionTerminal(
  props: SubmissionTerminalProps,
): JSX.Element {
  const { terminalState, onTerminalReady, terminalKey } = props;
  const fitAddon = useMemo(() => new FitAddon(), []);

  let terminalRef: Terminal | null = null;

  const getTerminal = (terminal: Terminal | null) => {
    terminalRef = terminal;
  };

  useEffect(() => {
    const terminalUpdateHandler = (key: string, content: string) => {
      if (key === terminalKey && terminalRef) {
        terminalRef.write(content);
        terminalRef.write("\x1B[0m");
        fitAddon.fit();
      }
    };

    TerminalObserver.subscribe(terminalKey, terminalUpdateHandler);

    return () => {
      TerminalObserver.unsubscribe(terminalKey, terminalUpdateHandler);
    };
  }, [terminalKey, onTerminalReady, terminalRef, fitAddon]);

  useLayoutEffect(() => {
    let resizeInterval: NodeJS.Timeout | undefined;

    if (terminalRef) {
      terminalRef.write(terminalState ?? "");
      onTerminalReady(terminalRef);
      terminalRef.write("\x1B[0m");
      fitAddon.fit();
      resizeInterval = setInterval(() => {
        fitAddon.fit();
      }, 1000);
    }

    return () => {
      if (resizeInterval) clearInterval(resizeInterval);
    };
  }, [terminalState, onTerminalReady, fitAddon, terminalRef]);

  return (
    <XTerm
      onTerminal={getTerminal}
      className="myXtermClass"
      addons={[fitAddon]}
    />
  );
}
