import http from "node:http";
import express, { Express, Router } from "express";
import cors from "cors";
import { errors } from "celebrate";
import WSSetupFunction from "./websocket";

// Centralized config with defaults
const CONFIG = {
  port: Number.parseInt(process.env.BACKEND_HTTP_PORT || "3001", 10),
  isDev: process.env.NODE_ENV !== "production"
}

export function createApp(apiRouter: Router): Express {
  const app = express();

  // Middleware setup
  app.use(cors());
  app.use(express.json());

  // Mount API routes
  app.use("/api", apiRouter);

  // Error handling middleware
  app.use(errors());

  return app;
}

export function startServer(apiRouter: Router): void {
  const app = createApp(apiRouter);
  const server = http.createServer(app);

  // Attach WebSocket server
  WSSetupFunction(server);

  server.listen(CONFIG.port, () => {
    console.log(`HTTP Server listening on port ${CONFIG.port}`);
    console.log(`WebSocket Server ready`);
  });

  const shutdown = () => {
    console.log("SIGTERM/SIGINT received. Shutting down gracefully...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}