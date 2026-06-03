import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import Entry from "./Theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Entry />
    </QueryClientProvider>
  </StrictMode>,
);
