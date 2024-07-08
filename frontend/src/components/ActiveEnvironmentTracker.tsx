import { useEffect, useRef } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { APIBasePath } from "../api/Request";
import { useAuthStore } from "../stores/authStore";

const ActiveEnvironmentTracker = (): JSX.Element => {
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const initSSE = async () => {
      try {
        console.log("initSSE");
        await fetchEventSource(`${APIBasePath}/admin/environments`, {
          method: "GET",
          headers: {
            "Content-Type": "text/event-stream",
            Authorization: useAuthStore.getState().token,
          },
          onmessage(ev) {
            console.log("SSE message");
            console.log(ev.data);
          },
          onclose() {
            console.log("SSE closed");
            stopResponseSSE();
          },
          async onopen(response) {
            console.log(response);
            if (response.ok) {
              console.log("SSE open");
            } else {
              console.log("SSE failed to open");
            }
            return Promise.resolve();
          },
          onerror(ev) {
            console.error(ev);
            throw new Error("SSE error");
          },
          signal: abortController.signal,
        });
      } catch (error) {
        console.log("Error initializing SSE:", error);
      }
    };

    initSSE().catch((error) => {
      console.log(error);
    });

    return () => {
      console.log("Cleanup");
      stopResponseSSE();
    };
  }, []);

  function stopResponseSSE() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("SSE connection aborted");
    }
    abortControllerRef.current = new AbortController();
  }

  return <p>Hello</p>;
};

export default ActiveEnvironmentTracker;
