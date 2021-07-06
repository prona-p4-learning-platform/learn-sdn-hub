import { EnvironmentDescription } from "../P4Environment";
import {
  AuthenticationProvider,
  AuthenticationResult,
} from "./AuthenticationProvider";

export default class PlaintextMultiuserAuthenticationProvider
  implements AuthenticationProvider {
  constructor() {
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
        return { username: username, userid: username, type: "plain" };
      }
    }
    throw new Error("AuthenticationError");
  }

  async filterAssignmentList(
    username: string,
    assignmentList: Map<string, EnvironmentDescription>
  ): Promise<Map<string, EnvironmentDescription>> {
    const usersAllowedAssignments = process.env.BACKEND_USER_ALLOWED_ASSIGNMENTS.split(
      ","
    );
    const users: Map<string, string> = new Map();
    usersAllowedAssignments.forEach((user) => {
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
    }
  }
}
