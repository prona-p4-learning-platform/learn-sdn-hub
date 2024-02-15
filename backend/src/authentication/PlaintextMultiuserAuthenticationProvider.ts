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
        "PlaintextMultiuserAuthenticationProvider: No BACKEND_USERS environment variable set. Cannot support multiple users.",
      );
    }
  }

  async authenticateUser(
    username: string,
    password: string,
  ): Promise<AuthenticationResult> {
    return new Promise((resolve, reject) => {
      const usersConfig = process.env.BACKEND_USERS?.split(",") ?? [];
      const users = new Map<string, string>();

      usersConfig.forEach((user) => {
        const [login, password] = user.split(":");

        users.set(login, password);
      });

      if (users.has(username)) {
        if (password === users.get(username)) {
          try {
            const groupNumber = this.persister.getUserMapping(username);
            const user: AuthenticationResult = {
              username,
              userid: username,
              groupNumber,
              type: "plain",
            };

            resolve(user);
          } catch (error) {
            if (error instanceof Error) reject(error);
            else
              reject(
                new Error(
                  "PlaintextMultiuserAuthenticationProvider: Cannot get user account.",
                ),
              );
          }
        }
      } else reject(new Error("AuthenticationError"));
    });
  }

  changePassword(
    _username: string,
    _oldPassword: string,
    _newPassword: string,
    _confirmNewPassword: string,
  ): Promise<void> {
    return Promise.reject(
      new Error(
        "PlaintextMultiuserAuthenticationProvider does not support password changes.",
      ),
    );
  }

  // export and use filterAssignmentList from PlaintextAuthenticationProvider? Duplicate code
  filterAssignmentList(
    username: string,
    assignmentList: Map<string, EnvironmentDescription>,
  ): Promise<Map<string, EnvironmentDescription>> {
    const usersAllowedAssignments =
      process.env.BACKEND_USER_ALLOWED_ASSIGNMENTS;

    if (usersAllowedAssignments !== undefined) {
      const users = new Map<string, string>();

      for (const user of usersAllowedAssignments.split(",")) {
        const [name, regex] = user.split(":");

        users.set(name, regex);
      }

      const user = users.get(username);
      if (user) {
        for (const key of assignmentList.keys()) {
          if (key.match(user) === null) {
            assignmentList.delete(key);
          }
        }
      } else {
        assignmentList.clear();
      }
    }

    return Promise.resolve(assignmentList);
  }
}
