import { Persister, UserEnvironment, UserAccount } from "./Persister";

const userEnvironments: Map<string, Map<string, UserEnvironment>> = new Map();
export default class MemoryPersister implements Persister {
  async GetUserAccount(username: string): Promise<UserAccount> {
    return {
      username,
      _id: username,
      password: "p4",
    };
  }

  async GetUserEnvironments(username: string): Promise<UserEnvironment[]> {
    const userEnvironment = userEnvironments.get(username);
    if (userEnvironment) {
      return [...userEnvironment.values()];
    }
    return [];
  }

  async AddUserEnvironment(
    username: string,
    identifier: string,
    description: string
  ): Promise<void> {
    if (
      userEnvironments.has(username) &&
      userEnvironments.get(username).has(identifier)
    ) {
      userEnvironments
        .get(username)
        .set(identifier, { identifier, description });
    }
  }

  async RemoveUserEnvironment(
    username: string,
    identifier: string
  ): Promise<void> {
    if (
      userEnvironments.has(username) &&
      userEnvironments.get(username).has(identifier)
    ) {
      userEnvironments.get(username).delete(identifier);
    }
  }

  async close(): Promise<void> {
    return undefined;
  }
}
