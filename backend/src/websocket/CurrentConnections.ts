// Tracks how many connections are currently active to a specific environment
// Environment: connectedUsers
interface ConnectionData {
  [environment: string]: number;
}

const connectionData: ConnectionData = {};

function changeConnection(environment: string, change: number): number {
  if (connectionData[environment] !== undefined) {
    connectionData[environment] += change;
    return connectionData[environment];
  } else {
    let initValue = 0;
    if (change > 0) {
      initValue = 1;
    }
    connectionData[environment] = initValue;
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
  if (connectionData[environment] !== undefined) {
    return connectionData[environment];
  } else {
    return 0;
  }
}
