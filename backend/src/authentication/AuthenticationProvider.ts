import { EnvironmentDescription } from "../P4Environment";

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
  getUserMapping(userid: string): Promise<number>;
}
