import { EnvironmentDescription } from "../Environment";

export interface AuthenticationResult {
  type: string;
  username: string;
  userid: string;
  groupNumber: number;
}

export interface AuthenticationProvider {
  authenticateUser(
    username: string,
    password: string
  ): Promise<AuthenticationResult>;
  filterAssignmentList(
    username: string,
    assignmentMap: Map<string, EnvironmentDescription>
  ): Promise<Map<string, EnvironmentDescription>>;
  changePassword(
    username: string,
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string
  ): Promise<void>;
}
