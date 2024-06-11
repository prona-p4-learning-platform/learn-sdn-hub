// Tracks how many connections are currently active to a specific environment
// Environment: connectedUsers
const connectionData = new Map<string, number>();

function changeConnection(environment: string, change: number): number {
  const connections = connectionData.get(environment);

  if (connections !== undefined) {
    const changed = connections + change;

    connectionData.set(environment, changed);
    return changed;
  } else {
    let initValue = 0;
    if (change > 0) {
      initValue = 1;
    }

    connectionData.set(environment, initValue);
    return initValue;
  }
}

export function addConnection(environment: string): number {
  return changeConnection(environment, 1);
}

export function removeConnection(environment: string): number {
  return changeConnection(environment, -1);
}

export function getConnectedCount(environment: string): number {
  const connections = connectionData.get(environment);

  if (connections !== undefined) {
    return connections;
  } else {
    return 0;
  }
}
