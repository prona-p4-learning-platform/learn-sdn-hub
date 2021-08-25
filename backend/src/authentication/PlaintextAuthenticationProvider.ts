import { EnvironmentDescription } from "../P4Environment";
import {
  AuthenticationProvider,
  AuthenticationResult,
} from "./AuthenticationProvider";

export default class PlaintextAuthenticationProvider
  implements AuthenticationProvider {
  async authenticateUser(
    username: string,
    password: string
  ): Promise<AuthenticationResult> {
    if (password === "p4") {
      return { username: username, userid: username, type: "plain" };
    }
    throw new Error("AuthenticationError");
  }

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
