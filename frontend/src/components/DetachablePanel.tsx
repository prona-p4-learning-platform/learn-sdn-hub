import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface DetachablePanelProps {
  children: ReactNode;
  title: string;
  isDetached: boolean;
  windowFeatures?: string;
  onWindowClose?: () => void;
}

export default function DetachablePanel({
  children,
  title,
  isDetached,
  windowFeatures = "width=900,height=700,left=100,top=100",
  onWindowClose,
}: DetachablePanelProps): JSX.Element {
  const [externalWindow, setExternalWindow] = useState<Window | null>(null);
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(
    null,
  );
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isDetached && !externalWindow) {
      // Create new window
      const newWindow = window.open("", "", windowFeatures);

      if (newWindow) {
        // Set window title
        newWindow.document.title = title;

        // Copy stylesheets from parent window (limit to first 50 for performance)
        const stylesheets = Array.from(document.styleSheets).slice(0, 50);
        stylesheets.forEach((stylesheet) => {
          try {
            if (stylesheet.href) {
              const link = newWindow.document.createElement("link");
              link.rel = "stylesheet";
              link.href = stylesheet.href;
              newWindow.document.head.appendChild(link);
            } else if (stylesheet.cssRules) {
              const style = newWindow.document.createElement("style");
              Array.from(stylesheet.cssRules).forEach((rule) => {
                style.appendChild(
                  newWindow.document.createTextNode(rule.cssText),
                );
              });
              newWindow.document.head.appendChild(style);
            }
          } catch (e) {
            console.warn("Could not copy stylesheet:", e);
          }
        });

        // Create container element for React portal
        const container = newWindow.document.createElement("div");
        container.id = "detached-panel-container";
        newWindow.document.body.appendChild(container);

        setExternalWindow(newWindow);
        setContainerElement(container);

        // Poll every 2 seconds to detect if window was closed externally
        intervalRef.current = window.setInterval(() => {
          if (newWindow.closed) {
            if (onWindowClose) {
              onWindowClose();
            }
            if (intervalRef.current !== null) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setExternalWindow(null);
            setContainerElement(null);
          }
        }, 2000);
      }
    } else if (!isDetached && externalWindow) {
      // Close external window when reattaching
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      externalWindow.close();
      setExternalWindow(null);
      setContainerElement(null);
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (externalWindow && !externalWindow.closed) {
        externalWindow.close();
      }
    };
  }, [isDetached, externalWindow, title, windowFeatures, onWindowClose]);

  // Render content in external window via portal or inline
  if (isDetached && containerElement) {
    return createPortal(children, containerElement);
  }

  return <>{children}</>;
}
