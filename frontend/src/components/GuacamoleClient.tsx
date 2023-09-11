import React from "react";
import Guacamole from "guacamole-common-js";
import createTunnel from '../api/GuacamoleTunnel'
import CircularProgress from "@mui/material/CircularProgress";

interface GuacamoleClientProps {
  alias: string;
  environment: string;
  wsEndpoint: string;
}

export default class GuacamoleClient extends React.Component<GuacamoleClientProps> {
    private guacaClient!: Guacamole.Client;
    private currentScale: number = 1;
    private rescaling: boolean = false;
    private startWidth: number = 0;
    private startHeight: number = 0;
  
    constructor(props: GuacamoleClientProps) {
      super(props);
    }
  
    componentDidMount() {
      const tunnel = createTunnel(this.props.wsEndpoint);

      this.guacaClient = new Guacamole.Client(
        tunnel
      );

      // Create guacamole display
      const guacDisplay = this.guacaClient.getDisplay();
      // Guacamole element for interaction
      const guacElement = guacDisplay.getElement();
      const guacContainer = document.getElementById("guacContainer");
      guacContainer!.appendChild(guacElement);

      guacContainer!.parentElement!.classList.add("guacTerminal");

      // Input element for keyboard
      // Captures input from keyboard and sends to Guacamole
      const input = document.getElementById("guacInput");

      // Needs element to capture keyboard input from
      // Can't be set to document, as this will capture input for FileEditor
      // Hidden input element will be used
      let keyboard = new Guacamole.Keyboard(input!);

      // Capture key events
      keyboard.onkeydown = (keysym) => {
        this.guacaClient.sendKeyEvent(1, keysym);
      };

      keyboard.onkeyup = (keysym) => {
        this.guacaClient.sendKeyEvent(0, keysym);
      };

      let mouse = new Guacamole.Mouse(guacElement);

      // Capture mouse movement over guacamole canvas
      mouse.onmousemove = (mouseState) => {
        mouseState.x = mouseState.x / this.currentScale;
        mouseState.y = mouseState.y / this.currentScale;
        this.guacaClient.sendMouseState(mouseState);
      };

      // Capture mouse clicks on guacamole canvas
      mouse.onmousedown = mouse.onmouseup = (mouseState) => {
        input!.focus();
        this.guacaClient.sendMouseState(mouseState);
      };

      // Resize guacamole display when window is resized
      this.observeForResize(guacDisplay);

      this.guacaClient.onerror = (error) => {
        if (error.code === Guacamole.Status.Code.UPSTREAM_NOT_FOUND) {
          // IP Address to Remote Desktop most likely wrong.
          this.showErrorMessage("Upstream server not found. Please contact an admin.")
        } else {
          this.showErrorMessage("Failed to connect to server. Please try again later.")
        }
        console.log(error);
      }

      this.guacaClient.connect();
    }

    // Show error message in error div
    showErrorMessage(message: string) {
      const errorEle = document.getElementById("guacErrorMessage");
      errorEle!.innerText = message;
      errorEle!.style.display = "block";
    }

    // Mutation observer to detect when guacamole canvas is resized on initialization
    observeForResize(display: Guacamole.Display) {
      document.getElementById("guacContainer")!.focus();
      const guacContainer = document.getElementById("guacContainer");
      var targetElement = guacContainer!.children[0];

      if (targetElement !== null) {
        // Create a new MutationObserver instance
        var observer = new MutationObserver((mutationsList, observer) => {
          let changed = false;
          for (var mutation of mutationsList) {
            if (mutation.type === "attributes" && mutation.attributeName === "style") {
              if (!changed) {
                changed = true;
                // Hide loading animation
                this.hideLoading();
                this.startWidth = targetElement.clientWidth;
                this.startHeight = targetElement.clientHeight;
                observer.disconnect();
                this.resizeHandler(guacContainer, display);
              }
            }
          }
        });

        // Configuration for the observer (watch for style attribute changes)
        var observerConfig = { attributes: true, attributeFilter: ["style"] };

        // Start observing the target element
        observer.observe(targetElement, observerConfig);
      }
    }

  // Mutation observer to detect when guacamole canvas is resized after initialization
    resizeHandler(eleToObserve: HTMLElement | null, display: Guacamole.Display) {
      if (eleToObserve === null) return;

      const containerEle = document.getElementsByClassName("myTerminalContainer")[0] as HTMLElement;

      const resizeObserver = new ResizeObserver((entries) => {
        // Cap resize to height, respect aspect ratio
        let maxHeight = parseInt(getComputedStyle(containerEle).getPropertyValue("height").match(/\d*/)![0]);

        for (const entry of entries) {
          if (entry.contentBoxSize && !this.rescaling) {
            this.rescaling = true;
            this.currentScale = (eleToObserve!.offsetWidth - 10) / this.startWidth;
            // Check if height is too big, then scale to height
            if (this.startHeight * this.currentScale > maxHeight) {
              this.currentScale = maxHeight / this.startHeight;
            }
            display.scale(this.currentScale);
            setTimeout(() => {
              this.rescaling = false;
            }, 100);
          }
        }
      });

      resizeObserver.observe(eleToObserve);
    }

    // Hide loading animation
    hideLoading() {
      const loadingEle = document.getElementById("guacLoading");
      loadingEle!.style.display = "none";
    }
  
    componentWillUnmount() {
      console.log("GuacamoleClient will unmount...")
      try {
        // Disconnect guacamole client - this will close the websocket connection
        if (this.guacaClient) this.guacaClient.disconnect();
      } catch (e) {
        console.log(e);
      }
    }
  
    render() {
      return (
        <><div id="guacContainer"></div><input type="text" id="guacInput"></input><p id="guacErrorMessage"></p><div id="guacLoading"><CircularProgress /></div></>
      );
    }
}  