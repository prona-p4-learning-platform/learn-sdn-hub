import WebSocket from "ws";

const subscriptions: Record<string, Set<WebSocket>> = {};

export default function SheetHandler(ws: WebSocket, environment: string): void {
  const key = `environment:${environment}`;

  if (!subscriptions[key]) {
    subscriptions[key] = new Set();
  }

  subscriptions[key].add(ws);

  ws.send(JSON.stringify({ type: "connected", message: "Subscribed to lab sheet updates." }));

  ws.on("close", () => {
    subscriptions[key].delete(ws);

    if (subscriptions[key].size === 0) {
      delete subscriptions[key];
    }
  });

  ws.on("error", (err) => {
    console.error("[SheetHandler] WebSocket error for", key, err);
  });
}

export function broadcastSheetUpdate(environment: string, content: string): void {
  const key = `environment:${environment}`;
  const clients = subscriptions[key];

  if (!clients || clients.size === 0) {
    return;
  }

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "sheet-update", content }));
      console.log("[broadcastSheetUpdate] Sent update to client");
    } else {
      console.log("[broadcastSheetUpdate] Skipped client, not open:", client.readyState);
    }
  }
}