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
    if (process.env.BACKEND_USERS != undefined) {
      let usersConfig = process.env.BACKEND_USERS.split(",");
      let users: Map<string, string> = new Map();
      usersConfig.forEach(user => {
        let login = user.split(":")[0];
        let password = user.split(":")[1];
        users.set(login, password);
      });

      if (users.has(username))
      {
        if (password === users.get(username)) {
          return { username: username, userid: username, type: "plain" };
        }
      }
    }
    else
    {
      if (password === "p4") {
        return { username: username, userid: username, type: "plain" };
      }
    }
    throw new Error("AuthenticationError");
  }
}
