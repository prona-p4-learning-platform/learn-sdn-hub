import { Persister, UserEnvironment, UserAccount } from "./Persister";

const environments: UserEnvironment[] = [];

export default class MemoryPersister implements Persister {
  async GetUserAccount(): Promise<UserAccount> {
    return {
      username: "testuser",
      _id: "user-id-123",
      password: "test123",
    };
  }

  async GetUserEnvironments(): Promise<UserEnvironment[]> {
    return environments;
  }

  async AddUserEnvironment(
    username: string,
    identifier: string,
    description: string
  ): Promise<void> {
    const filtered = environments.filter((e) => e.identifier === identifier);
    if (filtered.length === 0) {
      environments.push({ identifier, description });
    }
  }

  async RemoveUserEnvironment(
    username: string,
    identifier: string
  ): Promise<void> {}

  async close(): Promise<void> {}
}
