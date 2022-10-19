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
        "No BACKEND_USERS environment variable set. Cannot support multiple users."
      );
    }
  }

  async authenticateUser(
    username: string,
    password: string
  ): Promise<AuthenticationResult> {
    const usersConfig = process.env.BACKEND_USERS.split(",");
    const users: Map<string, string> = new Map();
    usersConfig.forEach((user) => {
      const login = user.split(":")[0];
      const password = user.split(":")[1];
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

  async changePassword(
    _username: string,
    _oldPassword: string,
    _newPassword: string,
    _confirmNewPassword: string
  ): Promise<void> {
    console.log(
      "PlaintextMultiuserAuthenticationProvider does not support password changes."
    );
    return;
  }

  // export and use filterAssignmentList from PlaintextAuthenticationProvider? Duplicate code
  async filterAssignmentList(
    username: string,
    assignmentList: Map<string, EnvironmentDescription>
  ): Promise<Map<string, EnvironmentDescription>> {
    const usersAllowedAssignments =
      process.env.BACKEND_USER_ALLOWED_ASSIGNMENTS;
    if (usersAllowedAssignments == undefined) {
      return assignmentList;
    } else {
      const users: Map<string, string> = new Map();
      usersAllowedAssignments.split(",").forEach((user) => {
        const name = user.split(":")[0];
        const regex = user.split(":")[1];
        users.set(name, regex);
      });
      if (users.has(username)) {
        const tempRegex = users.get(username);
        for (const key of assignmentList.keys()) {
          if (key.match(tempRegex) == null) {
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
