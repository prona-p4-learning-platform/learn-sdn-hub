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
}
