import { EnvironmentDescription } from "../Environment";
import {
  AuthenticationProvider,
  AuthenticationResult,
} from "./AuthenticationProvider";
import MemoryPersister from "../database/MemoryPersister";

// PlaintextMultiuserAuthenticationProvider is only used for standalone demo builds, e.g., using the provided docker compose file.
// The provider is using users that are defined in an environment variable.
// Therefore, this provider does not include several features that are only possible with a database or identity management providers.

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

  authenticateUser(
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

      const user = users.get(username);
      if (user !== undefined) {
        if (password === user) {
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
    return new Promise((resolve) => {
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

      resolve(assignmentList);
    });
  }
}
