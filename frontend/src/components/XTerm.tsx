import { Terminal, ITerminalAddon, ITerminalOptions } from "xterm";
import { createRef, useLayoutEffect } from "react";

import "xterm/css/xterm.css";

interface XTermProps {
  /**
   * Get the reference to the terminal.
   */
  onTerminal?(terminal: Terminal | null): void;
  /**
   * Class name to add to the terminal container.
   */
  className?: string;

  /**
   * Options to initialize the terminal with.
   */
  options?: ITerminalOptions;

  /**
   * An array of XTerm addons to load along with the terminal.
   */
  addons?: Array<ITerminalAddon>;

  /**
   * Adds an event listener for when a binary event fires. This is used to
   * enable non UTF-8 conformant binary messages to be sent to the backend.
   * Currently this is only used for a certain type of mouse reports that
   * happen to be not UTF-8 compatible.
   * The event value is a JS string, pass it to the underlying pty as
   * binary data, e.g. `pty.write(Buffer.from(data, 'binary'))`.
   */
  onBinary?(this: void, data: string): void;

  /**
   * Adds an event listener for the cursor moves.
   */
  onCursorMove?(this: void): void;

  /**
   * Adds an event listener for when a data event fires. This happens for
   * example when the user types or pastes into the terminal. The event value
   * is whatever `string` results, in a typical setup, this should be passed
   * on to the backing pty.
   */
  onData?(this: void, data: string): void;

  /**
   * Adds an event listener for when a key is pressed. The event value contains the
   * string that will be sent in the data event as well as the DOM event that
   * triggered it.
   */
  onKey?(this: void, event: { key: string; domEvent: KeyboardEvent }): void;

  /**
   * Adds an event listener for when a line feed is added.
   */
  onLineFeed?(this: void): void;

  /**
   * Adds an event listener for when a scroll occurs. The event value is the
   * new position of the viewport.
   */
  onScroll?(this: void, newPosition: number): void;

  /**
   * Adds an event listener for when a selection change occurs.
   */
  onSelectionChange?(this: void): void;

  /**
   * Adds an event listener for when rows are rendered. The event value
   * contains the start row and end rows of the rendered area (ranges from `0`
   * to `Terminal.rows - 1`).
   */
  onRender?(this: void, event: { start: number; end: number }): void;

  /**
   * Adds an event listener for when the terminal is resized. The event value
   * contains the new size.
   */
  onResize?(this: void, event: { cols: number; rows: number }): void;

  /**
   * Adds an event listener for when an OSC 0 or OSC 2 title change occurs.
   * The event value is the new title.
   */
  onTitleChange?(this: void, newTitle: string): void;

  /**
   * Attaches a custom key event handler which is run before keys are
   * processed, giving consumers of xterm.js ultimate control as to what keys
   * should be processed by the terminal and what keys should not.
   *
   * @param event The custom KeyboardEvent handler to attach.
   * This is a function that takes a KeyboardEvent, allowing consumers to stop
   * propagation and/or prevent the default action. The function returns
   * whether the event should be processed by xterm.js.
   */
  customKeyEventHandler?(this: void, event: KeyboardEvent): boolean;
}

export default function XTerm(props: XTermProps): JSX.Element {
  const terminalRef = createRef<HTMLDivElement>();

  useLayoutEffect(() => {
    const terminal = new Terminal(props.options);

    if (terminalRef.current) {
      // open terminal
      terminal.open(terminalRef.current);

      // activate addons
      if (props.addons) {
        for (const addon of props.addons) {
          terminal.loadAddon(addon);
        }
      }

      // set listeners
      if (props.onBinary) terminal.onBinary(props.onBinary);
      if (props.onCursorMove) terminal.onCursorMove(props.onCursorMove);
      if (props.onData) terminal.onData(props.onData);
      if (props.onKey) terminal.onKey(props.onKey);
      if (props.onLineFeed) terminal.onLineFeed(props.onLineFeed);
      if (props.onRender) terminal.onRender(props.onRender);
      if (props.onResize) terminal.onResize(props.onResize);
      if (props.onScroll) terminal.onScroll(props.onScroll);
      if (props.onSelectionChange)
        terminal.onSelectionChange(props.onSelectionChange);
      if (props.onTitleChange) terminal.onTitleChange(props.onTitleChange);

      // add custom key handler
      if (props.customKeyEventHandler) {
        terminal.attachCustomKeyEventHandler(props.customKeyEventHandler);
      }

      // send ref
      props.onTerminal?.(terminal);
    }

    return () => {
      props.onTerminal?.(null);
      terminal.dispose();
    };
  });

  return <div className={props.className} ref={terminalRef} />;
}
