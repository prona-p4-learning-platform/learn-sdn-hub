import { EnvironmentDescription } from "../Environment";
import {
  AuthenticationProvider,
  AuthenticationResult,
} from "./AuthenticationProvider";
import MemoryPersister from "../database/MemoryPersister";

export default class PlaintextMultiuserAuthenticationProvider
  implements AuthenticationProvider
{
  private persister: MemoryPersister;

  constructor(persister: MemoryPersister) {
    this.persister = persister;
    if (process.env.BACKEND_USERS === undefined) {
      throw new Error(
        "No BACKEND_USERS environment variable set. Cannot support multiple users.",
      );
    }
  }

  async authenticateUser(
    username: string,
    password: string,
  ): Promise<AuthenticationResult> {
    const usersConfig = process.env.BACKEND_USERS?.split(",") ?? [];
    const users = new Map<string, string>();

    usersConfig.forEach((user) => {
      const split = user.split(":");
      const login = split[0];
      const password = split[1];

      users.set(login, password);
    });

    if (users.has(username)) {
      if (password === users.get(username)) {
        return {
          username: username,
          // plaintext provider is simplistic and does not use ids, hence use username also as ID
          userid: username,
          groupNumber: await this.persister.getUserMapping(username),
          type: "plain",
        };
      }
    }
    throw new Error("AuthenticationError");
  }

  /*eslint @typescript-eslint/no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
  async changePassword(
    _username: string,
    _oldPassword: string,
    _newPassword: string,
    _confirmNewPassword: string,
  ): Promise<void> {
    throw new Error(
      "PlaintextMultiuserAuthenticationProvider does not support password changes.",
    );
  }

  // export and use filterAssignmentList from PlaintextAuthenticationProvider? Duplicate code
  async filterAssignmentList(
    username: string,
    assignmentList: Map<string, EnvironmentDescription>,
  ): Promise<Map<string, EnvironmentDescription>> {
    const usersAllowedAssignments =
      process.env.BACKEND_USER_ALLOWED_ASSIGNMENTS;

    if (usersAllowedAssignments === undefined) {
      return assignmentList;
    } else {
      const users = new Map<string, string>();

      for (const user of usersAllowedAssignments.split(",")) {
        const split = user.split(":");
        const name = split[0];
        const regex = split[1];

        users.set(name, regex);
      }

      const user = users.get(username);
      if (user) {
        for (const key of assignmentList.keys()) {
          if (key.match(user) === null) {
            assignmentList.delete(key);
          }
        }

        return assignmentList;
      } else {
        assignmentList.clear();
        return assignmentList;
      }
    }
  }
}
