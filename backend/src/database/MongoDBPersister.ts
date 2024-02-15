import { MongoClient } from "mongodb";
import { hash } from "bcrypt";
import { Persister, UserEnvironment, UserAccount } from "./Persister";
import {
  Submission,
  SubmissionFileType,
  TerminalStateType,
} from "../Environment";

const saltRounds = 10;

interface EnvironmentEntry {
  environment: string;
  description: string;
  instance: string;
}

interface UserEntry {
  _id?: string;
  username: string;
  password?: string;
  passwordHash?: string;
  groupNumber: number;
  assignmentListFilter?: string;
  environments: EnvironmentEntry[];
}

interface SubmissionEntry {
  _id?: string;
  username: string;
  groupNumber: number;
  environment: string;
  submissionCreated: Date;
  terminalStatus: TerminalStateType[];
  submittedFiles: SubmissionFileType[];
}

export default class MongoDBPersister implements Persister {
  private mongoClient?: MongoClient;
  private connectURL: string;
  private connectPromise?: Promise<MongoClient>;

  constructor(url: string) {
    this.connectURL = url;
  }

  private async getClient(): Promise<MongoClient> {
    if (!this.connectPromise) {
      this.connectPromise = MongoClient.connect(this.connectURL);
    }

    if (!this.mongoClient) {
      const client = await this.connectPromise;
      this.mongoClient = client;
    }

    return this.mongoClient;
  }

  async GetUserAccount(username: string): Promise<UserAccount> {
    const client = await this.getClient();
    const result = await client
      .db()
      .collection<UserEntry>("users")
      .findOne({ username });

    if (result) return result;
    else throw new Error("MongoDBPersister: UserAccount not found.");
  }

  async ChangeUserPassword(
    username: string,
    password: string,
  ): Promise<UserAccount> {
    const passwordHash = await hash(password, saltRounds);
    const client = await this.getClient();
    const result = await client
      .db()
      .collection<UserEntry>("users")
      .findOneAndUpdate(
        { username },
        { $set: { passwordHash }, $unset: { password: "" } },
      );

    if (result) return result;
    else
      throw new Error(
        "MongoDBPersister: Password not changed as the user account could not be found.",
      );
  }

  async GetUserEnvironments(username: string): Promise<UserEnvironment[]> {
    const client = await this.getClient();
    return await client
      .db()
      .collection<UserEntry>("users")
      .findOne({ username }, { projection: { environments: 1 } })
      .then((result) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return result && result.environments ? result.environments : [];
      });
  }

  async AddUserEnvironment(
    username: string,
    environment: string,
    description: string,
    instance: string,
  ): Promise<void> {
    const client = await this.getClient();
    await client
      .db()
      .collection<UserEntry>("users")
      .findOneAndUpdate(
        { username, "environments.environment": { $ne: environment } },
        { $push: { environments: { environment, description, instance } } },
        {
          projection: { environments: 1 },
        },
      );
  }

  async RemoveUserEnvironment(
    username: string,
    environment: string,
  ): Promise<void> {
    const client = await this.getClient();
    await client
      .db()
      .collection<UserEntry>("users")
      .findOneAndUpdate(
        { username, "environments.environment": { $eq: environment } },
        { $pull: { environments: { environment } } },
        {
          projection: { environments: 1 },
        },
      );
  }

  async SubmitUserEnvironment(
    username: string,
    groupNumber: number,
    environment: string,
    terminalStates: TerminalStateType[],
    submittedFiles: SubmissionFileType[],
  ): Promise<void> {
    console.log(
      "Storing assignment result for user: " +
        username +
        " assignment environment: " +
        environment +
        " terminalStates: " +
        terminalStates.join(","),
    );

    const now = new Date();
    const client = await this.getClient();
    // TODO: Transactions should be used here but MongoDB only allows transactions
    // to be used in replicated environments
    // see: https://www.mongodb.com/docs/manual/core/transactions-production-consideration/#availability

    // delete previous submissions of user and group, to ensure that there is
    // only one/most recent submission for the assignment

    // delete all previous submissions of this environment for the current user
    const delUser = client
      .db()
      .collection<SubmissionEntry>("submissions")
      .deleteMany({
        username: username,
        environment: environment,
      })
      .catch((err) => {
        throw new Error(
          "Unable to delete previous submissions for this user.\n" + err,
        );
      });

    // delete all previous submissions of this environment for the current group
    const delGroup = client
      .db()
      .collection<SubmissionEntry>("submissions")
      .deleteMany({
        groupNumber: groupNumber,
        environment: environment,
      })
      .catch((err) => {
        throw new Error(
          "Unable to delete previous submissions for this group.\n" + err,
        );
      });

    // wait for deletion
    await Promise.all([delUser, delGroup]);

    // add new submission after successful deletion
    await client
      .db()
      .collection<SubmissionEntry>("submissions")
      .insertOne({
        username: username,
        groupNumber: groupNumber,
        environment: environment,
        submissionCreated: now,
        terminalStatus: terminalStates,
        submittedFiles: submittedFiles,
      })
      .catch((err) => {
        throw new Error("Failed to store submissions in mongodb.\n" + err);
      });
  }

  async GetUserSubmissions(
    username: string,
    groupNumber: number,
  ): Promise<Submission[]> {
    const client = await this.getClient();

    // retrieve all previous submissions for the current user or group
    return await client
      .db()
      .collection<SubmissionEntry>("submissions")
      .find({
        $or: [{ username: username }, { groupNumber: groupNumber }],
      })
      .toArray()
      .then((submissionsFound) => {
        const submissions: Submission[] = [];
        for (const submission of submissionsFound) {
          submissions.push({
            assignmentName: submission.environment,
            lastChanged: submission.submissionCreated,
          });
        }

        return submissions;
      })
      .catch((err) => {
        throw new Error(
          "Unable to retrieve submissions of user or group.\n" + err,
        );
      });
  }

  async close(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}
