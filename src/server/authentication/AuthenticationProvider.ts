export interface AuthenticationResult {
  type: string;
  username: string;
  token: string;
}

export interface AuthenticationProvider {
  authenticateUser(
    username: string,
    password: string
  ): Promise<AuthenticationResult>;
}
