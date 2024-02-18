import {
  AuthenticationProvider,
  AuthenticationResult,
} from "./AuthenticationProvider";
import MongoDBPersister from "../database/MongoDBPersister";
import { compare } from "bcrypt";
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
    password: string,
  ): Promise<AuthenticationResult> {
    const user = await this.persister.GetUserAccount(username);
    console.log("Authenticating user in mongodb: " + user.username);
    if (
      user.password === password ||
      (await compare(password, user.passwordHash ?? ""))
    ) {
      return {
        username: user.username,
        userid: user._id,
        groupNumber: user.groupNumber,
        type: "mongodb",
      };
    }
    throw new Error("AuthenticationError");
  }

  async changePassword(
    username: string,
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<void> {
    const user = await this.persister.GetUserAccount(username);

    if (
      newPassword.length !== 0 &&
      (user.password === oldPassword ||
        (await compare(oldPassword, user.passwordHash ?? ""))) &&
      newPassword === confirmNewPassword
    ) {
      console.log(`Change password in mongodb for User : ${user.username}`);
      await this.persister.ChangeUserPassword(username, newPassword);
    } else {
      throw new Error("ChangePasswordError");
    }
  }

  // enhance to allow overiding with filter defined for the user in mongodb?
  async filterAssignmentList(
    username: string,
    assignmentList: Map<string, EnvironmentDescription>,
  ): Promise<Map<string, EnvironmentDescription>> {
    const user = await this.persister.GetUserAccount(username);

    if (user.assignmentListFilter !== undefined) {
      const tempRegex = user.assignmentListFilter;
      for (const key of assignmentList.keys()) {
        if (key.match(tempRegex) == null) {
          assignmentList.delete(key);
        }
      }
    } else {
      const usersAllowedAssignments =
        process.env.BACKEND_USER_ALLOWED_ASSIGNMENTS;

      if (usersAllowedAssignments !== undefined) {
        const users = new Map<string, string>();

        usersAllowedAssignments.split(",").forEach((user) => {
          const [name, regex] = user.split(":");

          users.set(name, regex);
        });

        const user = users.get(username);
        if (user) {
          for (const key of assignmentList.keys()) {
            if (key.match(user) === null) {
              assignmentList.delete(key);
            }
          }
        } else {
          assignmentList.clear();
        }
      }
    }

    return assignmentList;
  }
}
