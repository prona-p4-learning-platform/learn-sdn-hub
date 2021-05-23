import { MongoClient } from "mongodb";
import { Persister, UserEnvironment, UserAccount } from "./Persister";
import fs from "fs";
import path from "path";

// TODO: place type in separate file and import it from there, where needed?
type TerminalStateType = {
  endpoint: string;
  state: string;
};

export default class MongoDBPersister implements Persister {
  private mongoClient: MongoClient = null;
  private connectURL: string;
  private connectPromise: Promise<MongoClient>;

  constructor(url: string) {
    this.connectURL = url;
  }

  private async getClient(): Promise<MongoClient> {
    if (!this.connectPromise) {
      this.connectPromise = MongoClient.connect(this.connectURL, {
        useUnifiedTopology: true,
      });
    }
    if (!this.mongoClient) {
      const client = await this.connectPromise;
      this.mongoClient = client;
    }
    return this.mongoClient;
  }

  async GetUserAccount(username: string): Promise<UserAccount> {
    const client = await this.getClient();
    return client.db().collection("users").findOne({ username });
  }

  async GetUserEnvironments(username: string): Promise<UserEnvironment[]> {
    const client = await this.getClient();
    return client
      .db()
      .collection("users")
      .findOne({ username }, { projection: { environments: 1 } })
      .then((result) =>
        result && result.environments ? result.environments : []
      );
  }

  async AddUserEnvironment(
    username: string,
    identifier: string,
    description: string
  ): Promise<void> {
    const client = await this.getClient();
    return client
      .db()
      .collection("users")
      .findOneAndUpdate(
        { username, "environments.identifier": { $ne: identifier } },
        { $push: { environments: { identifier, description } } },
        {
          projection: { environments: 1 },
        }
      )
      .then(() => undefined);
  }

  async RemoveUserEnvironment(
    username: string,
    identifier: string
  ): Promise<void> {
    const client = await this.getClient();
    return client
      .db()
      .collection("users")
      .findOneAndUpdate(
        { username, "environments.identifier": { $eq: identifier } },
        { $pull: { environments: { identifier } } },
        {
          projection: { environments: 1 },
        }
      )
      .then(() => undefined);
  }

  // TODO: currently stores files locally, maybe also store them in mongodb? or otherwise use shared function for a all persisters for that?
  async SubmitUserEnvironment(
    username: string,
    identifier: string,
    terminalStates: TerminalStateType[],
    submittedFiles: Map<string, string>
  ): Promise<void> {
    console.log(
      "Storing assignment result for user: " +
        username +
        " assignment identifitier: " +
        identifier +
        " terminalStates: " +
        terminalStates
    );
    const resultPathRoot = path.resolve("src", "assignments", "results");
    !fs.existsSync(resultPathRoot) && fs.mkdirSync(resultPathRoot);

    const resultDirName = username + "-" + identifier;
    const resultPath = path.resolve(resultPathRoot, resultDirName);
    !fs.existsSync(resultPath) && fs.mkdirSync(resultPath);

    for (const terminalState of terminalStates) {
      fs.writeFileSync(
        path.resolve(
          resultPath,
          terminalState.endpoint.split("/").slice(-1) + "-output.txt"
        ),
        terminalState.state,
        "binary"
      );
    }

    for (const [alias, fileContent] of submittedFiles) {
      fs.writeFileSync(path.resolve(resultPath, alias), fileContent, "binary");
    }
  }

  async close(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}
