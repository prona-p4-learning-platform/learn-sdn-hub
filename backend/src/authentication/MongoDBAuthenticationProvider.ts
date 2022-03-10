import {
  AuthenticationProvider,
  AuthenticationResult,
} from "./AuthenticationProvider";
import MongoDBPersister from "../database/MongoDBPersister";
import { EnvironmentDescription } from "../P4Environment";

export default class MongoDBAuthenticationProvider
  implements AuthenticationProvider {
  private persister: MongoDBPersister;

  constructor(persister: MongoDBPersister) {
    this.persister = persister;
  }

  async authenticateUser(
    username: string,
    password: string
  ): Promise<AuthenticationResult> {
    const user = await this.persister.GetUserAccount(username);
    console.log(user);
    if (user.password === password) {
      return {
        username: user.username,
        userid: user._id,
        groupNumber: await this.getUserMapping(user.username),
        type: "mongodb",
      };
    }
    throw new Error("AuthenticationError");
  }

  //TODO: currently does not filter anything, needs to get a field in mongodb
  async filterAssignmentList(
    username: string,
    assignmentList: Map<string, EnvironmentDescription>
  ): Promise<Map<string, EnvironmentDescription>> {
    return assignmentList;
  }

  //TODO: currently groups are not supported, needs to get a field in mongodb
  async getUserMapping(userid: string): Promise<number> {
    return 0;
  }
}
