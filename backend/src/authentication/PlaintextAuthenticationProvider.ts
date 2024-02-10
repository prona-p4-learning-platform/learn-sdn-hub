import { EnvironmentDescription } from "../Environment";
import {
  AuthenticationProvider,
  AuthenticationResult,
} from "./AuthenticationProvider";

export default class PlaintextAuthenticationProvider
  implements AuthenticationProvider
{
  async authenticateUser(
    username: string,
    password: string,
  ): Promise<AuthenticationResult> {
    if (password === "p4") {
      return {
        username: username,
        // plaintext provider is simplistic and does not use ids,
        // use username also as ID and set group to be 0 always
        userid: username,
        groupNumber: 0,
        type: "plain",
      };
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
      "PlaintextAuthenticationProvider does not support password changes.",
    );
  }

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
