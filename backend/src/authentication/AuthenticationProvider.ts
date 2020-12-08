export interface AuthenticationResult {
  type: string;
  username: string;
  userid: string;
}

export interface AuthenticationProvider {
  authenticateUser(
    username: string,
    password: string
  ): Promise<AuthenticationResult>;
}
