import { ServerResponse } from "http";
import ActiveEnvironmentTracker from "../trackers/ActiveEnvironmentTracker";

export default class TrackerSSEHandler {
  private static clients: Map<string, ServerResponse> = new Map();

  public static clientAlreadyConnected(username: string): boolean {
    return this.clients.has(username);
  }

  public static addClient(client: ServerResponse, username: string): void {
    this.forceCloseStaleConnection(username);
    this.clients.set(username, client);
  }

  public static removeClient(username: string): void {
    this.clients.delete(username);
  }

  public static sendInitialActivityData(client: ServerResponse): void {
    const data = JSON.stringify(
      Object.fromEntries(ActiveEnvironmentTracker.getActivityMap()),
    );

    client.write(`data: ${data}\n\n`);
  }

  public static forceCloseStaleConnection(username: string): void {
    if (this.clientAlreadyConnected(username)) {
      const client = this.clients.get(username);
      client?.end();
    }
  }
}
