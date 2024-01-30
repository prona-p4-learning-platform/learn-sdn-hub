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
  private mongoClient: MongoClient = null;
  private connectURL: string;
  private connectPromise: Promise<MongoClient>;

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
    return client.db().collection<UserEntry>("users").findOne({ username });
  }

  async ChangeUserPassword(
    username: string,
    password: string
  ): Promise<UserAccount> {
    const passwordHash = await hash(password, saltRounds);
    const client = await this.getClient();
    return client
      .db()
      .collection<UserEntry>("users")
      .findOneAndUpdate(
        { username },
        { $set: { passwordHash }, $unset: { password: "" } }
      )
      .then(() => undefined);
  }

  async GetUserEnvironments(username: string): Promise<UserEnvironment[]> {
    const client = await this.getClient();
    return client
      .db()
      .collection<UserEntry>("users")
      .findOne({ username }, { projection: { environments: 1 } })
      .then((result) =>
        result && result.environments ? result.environments : []
      );
  }

  async AddUserEnvironment(
    username: string,
    environment: string,
    description: string,
    instance: string
  ): Promise<void> {
    const client = await this.getClient();
    return client
      .db()
      .collection<UserEntry>("users")
      .findOneAndUpdate(
        { username, "environments.environment": { $ne: environment } },
        { $push: { environments: { environment, description, instance } } },
        {
          projection: { environments: 1 },
        }
      )
      .then(() => undefined);
  }

  async RemoveUserEnvironment(
    username: string,
    environment: string
  ): Promise<void> {
    const client = await this.getClient();
    return client
      .db()
      .collection<UserEntry>("users")
      .findOneAndUpdate(
        { username, "environments.environment": { $eq: environment } },
        { $pull: { environments: { environment } } },
        {
          projection: { environments: 1 },
        }
      )
      .then(() => undefined);
  }

  async SubmitUserEnvironment(
    username: string,
    groupNumber: number,
    environment: string,
    terminalStates: TerminalStateType[],
    submittedFiles: SubmissionFileType[]
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      console.log(
        "Storing assignment result for user: " +
          username +
          " assignment environment: " +
          environment +
          " terminalStates: " +
          terminalStates
      );

      const now = new Date();

      const client = await this.getClient();

      // delete previous submissions of user and group, to ensure that there is
      // only one/most recent submission for the assignment

      // delete all previous submissions of this environment for the current user
      client
        .db()
        .collection<SubmissionEntry>("submissions")
        .deleteMany({
          username: username,
          environment: environment,
        })
        .catch((err) => {
          return reject(
            new Error(
              "Unable to delete previous submissions for this user." + err
            )
          );
        });
      // delete all previous submissions of this environment for the current group
      client
        .db()
        .collection<SubmissionEntry>("submissions")
        .deleteMany({
          groupNumber: groupNumber,
          environment: environment,
        })
        .catch((err) => {
          return reject(
            new Error(
              "Unable to delete previous submissions for this group." + err
            )
          );
        });

      return client
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
        .then(() => {
          return resolve();
        })
        .catch((err) => {
          return reject("Failed to store submissions in mongodb " + err);
        });
    });
  }

  async GetUserSubmissions(
    username: string,
    groupNumber: number
  ): Promise<Submission[]> {
    return new Promise<Submission[]>(async (resolve, reject) => {
      const submissions: Array<Submission> = [];

      const client = await this.getClient();

      // retrieve all previous submissions the current user or group
      client
        .db()
        .collection<SubmissionEntry>("submissions")
        .find({
          $or: [{ username: username }, { groupNumber: groupNumber }],
        })
        .toArray()
        .then((submissionsFound) => {
          for (const submission of submissionsFound as Array<SubmissionEntry>) {
            submissions.push({
              assignmentName: submission.environment,
              lastChanged: submission.submissionCreated,
            });
          }
          // console.log(
          //   "Retrieved submissions for user: " +
          //     username +
          //     " in group: " +
          //     groupNumber +
          //     " result: " +
          //     JSON.stringify(submissions)
          // );
          return resolve(submissions);
        })
        .catch((err) => {
          return reject(
            new Error("Unable to retrieve submissions of user or group.") + err
          );
        });
    });
  }

  async close(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}
