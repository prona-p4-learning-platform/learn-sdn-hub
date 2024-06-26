import { EnvironmentDescription } from "../Environment";
import {
  AuthenticationProvider,
  AuthenticationResult,
} from "./AuthenticationProvider";

export default class PlaintextAuthenticationProvider
  implements AuthenticationProvider
{
  authenticateUser(
    username: string,
    password: string,
  ): Promise<AuthenticationResult> {
    return new Promise((resolve, reject) => {
      if (password === "p4") {
        const user: AuthenticationResult = {
          username,
          userid: username,
          groupNumber: 0,
          type: "plain",
        };

        resolve(user);
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
        "PlaintextAuthenticationProvider does not support password changes.",
      ),
    );
  }

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
