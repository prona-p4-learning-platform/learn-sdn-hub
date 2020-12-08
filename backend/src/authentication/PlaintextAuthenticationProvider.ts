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
    if (password === "test123") {
      return { username: username, userid: "test123", type: "plain" };
    }
    throw new Error("AuthenticationError");
  }
}
