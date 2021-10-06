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
        return {
          username: username,
          userid: username,
          groupNumber: await this.getUserMapping(username),
          type: "plain",
        };
      }
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

  async getUserMapping(userid: string): Promise<number> {
    if (process.env.BACKEND_USER_MAPPING != undefined) {
      const userMappingConfig = process.env.BACKEND_USER_MAPPING.split(",");
      const usermap: Map<string, number> = new Map();
      userMappingConfig.forEach((userMappingConfigEntry) => {
        const login = userMappingConfigEntry.split(":")[0];
        const instanceNumber = userMappingConfigEntry.split(":")[1];
        usermap.set(login, parseInt(instanceNumber));
      });

      if (usermap.has(userid)) {
        console.log(
          "Mapped user " + userid + " to group number " + usermap.get(userid)
        );
        return usermap.get(userid);
      } else {
        throw new Error(
          "No mapping defined to map user " + userid + " to a group."
        );
      }
    } else {
      console.log(
        "No BACKEND_USER_MAPPING environment variable set. Mapping user to group 0."
      );
      return 0;
    }
  }
}
