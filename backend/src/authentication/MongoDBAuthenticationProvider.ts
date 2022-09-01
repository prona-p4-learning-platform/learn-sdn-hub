import {
  AuthenticationProvider,
  AuthenticationResult,
} from "./AuthenticationProvider";
import MongoDBPersister from "../database/MongoDBPersister";
import { EnvironmentDescription } from "../Environment";

/*
Example users.json: 
{"_id":{"$oid":"60c3eb797312c19e89c338c7"},"username":"user2","group":"0", "password":"unsafe-example-password","environments":[{"environment":"user2-p4basic","description":"p4basic description"}]}

Example users.metadata.json:
{"indexes":[{"v":{"$numberInt":"2"},"key":{"_id":{"$numberInt":"1"}},"name":"_id_"},{"v":{"$numberInt":"2"},"key":{"username":{"$numberInt":"1"}},"name":"username_1","unique":true}],"uuid":"54e7a106841a41b48b43fe62e37d857a","collectionName":"users","type":"collection"}

username should have an index to ensure uniqueness of username entries
*/

export default class MongoDBAuthenticationProvider
  implements AuthenticationProvider
{
  private persister: MongoDBPersister;

  constructor(persister: MongoDBPersister) {
    this.persister = persister;
  }

  async authenticateUser(
    username: string,
    password: string
  ): Promise<AuthenticationResult> {
    const user = await this.persister.GetUserAccount(username);
    console.log("Authenticating user in mongodb: " + user);
    if (user.password === password) {
      return {
        username: user.username,
        userid: user._id,
        groupNumber: user.groupNumber ?? 0,
        type: "mongodb",
      };
    }
    throw new Error("AuthenticationError");
  }

  // enhance to allow overiding with filter defined for the user in mongodb?
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
}
