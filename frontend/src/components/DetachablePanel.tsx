import { useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";

interface DetachablePanelProps {
  children: ReactNode;
  title: string;
  isDetached: boolean;
  windowFeatures?: string;
  onWindowClose?: () => void;
}

/**
 * DetachablePanel component that renders content in a separate window when detached
 * 
 * @param children - The content to be rendered in the panel
 * @param title - The title for the detached window
 * @param isDetached - Whether the panel is currently detached
 * @param windowFeatures - Custom window features string for window.open()
 * @param onWindowClose - Callback when the external window is closed
 */
export default function DetachablePanel({
  children,
  title,
  isDetached,
  windowFeatures = "width=900,height=700,left=100,top=100",
  onWindowClose,
}: DetachablePanelProps): JSX.Element | null {
  const externalWindowRef = useRef<Window | null>(null);
  const containerDivRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isDetached && !externalWindowRef.current) {
      // Open new window
      const newWindow = window.open("", title, windowFeatures);
      
      if (!newWindow) {
        console.error("Failed to open new window. Please check popup blocker settings.");
        onWindowClose?.();
        return;
      }

      externalWindowRef.current = newWindow;

      // Copy styles from parent window to new window
      const parentStyleSheets = Array.from(document.styleSheets);
      parentStyleSheets.forEach((styleSheet) => {
        try {
          if (styleSheet.href) {
            const link = newWindow.document.createElement("link");
            link.rel = "stylesheet";
            link.href = styleSheet.href;
            newWindow.document.head.appendChild(link);
          } else if (styleSheet.cssRules) {
            const style = newWindow.document.createElement("style");
            Array.from(styleSheet.cssRules).forEach((rule) => {
              style.appendChild(newWindow.document.createTextNode(rule.cssText));
            });
            newWindow.document.head.appendChild(style);
          }
        } catch (e) {
          console.warn("Could not copy stylesheet:", e);
        }
      });

      // Set basic styling for the new window
      newWindow.document.title = title;
      newWindow.document.body.style.margin = "0";
      newWindow.document.body.style.padding = "0";
      newWindow.document.body.style.overflow = "auto";
      newWindow.document.body.style.backgroundColor = getComputedStyle(document.body).backgroundColor;

      // Create container div in new window
      const containerDiv = newWindow.document.createElement("div");
      containerDiv.id = "detached-panel-container";
      containerDiv.style.height = "100vh";
      containerDiv.style.width = "100%";
      newWindow.document.body.appendChild(containerDiv);
      containerDivRef.current = containerDiv;

      // Handle window close
      const handleWindowClose = () => {
        onWindowClose?.();
      };

      newWindow.addEventListener("beforeunload", handleWindowClose);
    }

    // Cleanup function
    return () => {
      if (!isDetached && externalWindowRef.current && !externalWindowRef.current.closed) {
        externalWindowRef.current.close();
        externalWindowRef.current = null;
        containerDivRef.current = null;
      }
    };
  }, [isDetached, title, windowFeatures, onWindowClose]);

  // Check if window was closed externally
  useEffect(() => {
    if (!isDetached || !externalWindowRef.current) return;

    const checkWindowClosed = setInterval(() => {
      if (externalWindowRef.current?.closed) {
        externalWindowRef.current = null;
        containerDivRef.current = null;
        onWindowClose?.();
      }
    }, 500);

    return () => {
      clearInterval(checkWindowClosed);
    };
  }, [isDetached, onWindowClose]);

  // Render children in the external window if detached
  if (isDetached && containerDivRef.current) {
    return createPortal(children, containerDivRef.current);
  }

  // Render children normally if not detached
  return <>{children}</>;
}
