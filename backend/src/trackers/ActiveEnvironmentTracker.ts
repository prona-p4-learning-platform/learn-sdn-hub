export interface GroupData {
  usernames: string[];
  groupNumber: number;
}

export interface EnvironmentData {
  environmentId: string;
  sshPort: number;
  lsPort: number;
  ipAddress: string;
  startTimestamp: number;
  remoteDesktopPort?: number;
  lifetimeMinutes?: number;
}

export interface ActivityData {
  groupData: GroupData;
  environmentData: EnvironmentData;
}

export default class ActiveEnvironmentTracker {
  private static activityMap: Map<string, ActivityData> = new Map();

  constructor() {
    if (!ActiveEnvironmentTracker.activityMap)
      ActiveEnvironmentTracker.activityMap = new Map();
  }

  public static addActivity(
    instanceId: string,
    activityData: ActivityData,
  ): void {
    if (instanceId !== "" && activityData !== null) {
      if (ActiveEnvironmentTracker.activityMap.has(instanceId)) {
        ActiveEnvironmentTracker.addUsernameToActivity(
          activityData.groupData.usernames[0],
          instanceId,
        );
      } else {
        ActiveEnvironmentTracker.activityMap.set(instanceId, activityData);
      }
    }
  }

  public static removeUserActivity(username: string, instanceId: string): void {
    if (
      ActiveEnvironmentTracker.activityMap.has(instanceId) &&
      username !== ""
    ) {
      const groupData =
        ActiveEnvironmentTracker.activityMap.get(instanceId)?.groupData;

      const index = groupData?.usernames.indexOf(username);
      if (index !== undefined && index !== -1) {
        groupData?.usernames.splice(index, 1);
      }
      if (groupData?.usernames.length === 0)
        ActiveEnvironmentTracker.activityMap.delete(instanceId);
    }
  }

  public static removeActivity(instanceId: string): void {
    if (ActiveEnvironmentTracker.activityMap.has(instanceId))
      ActiveEnvironmentTracker.activityMap.delete(instanceId);
  }

  public static getActivityMap(): Map<string, ActivityData> {
    return ActiveEnvironmentTracker.activityMap;
  }

  private static addUsernameToActivity(
    username: string,
    instanceId: string,
  ): void {
    if (
      ActiveEnvironmentTracker.activityMap.has(instanceId) &&
      !ActiveEnvironmentTracker.activityMap
        .get(instanceId)
        ?.groupData.usernames.includes(username)
    ) {
      ActiveEnvironmentTracker.activityMap
        .get(instanceId)
        ?.groupData.usernames.push(username);
    }
  }
}
