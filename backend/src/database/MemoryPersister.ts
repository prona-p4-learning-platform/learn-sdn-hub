import { Persister, UserEnvironment, UserAccount } from "./Persister";
import fs from "fs";
import path from "path";

// TODO: place type in separate file and import it from there, where needed?
type TerminalStateType = {
  endpoint: string;
  state: string;
};

const userEnvironments: Map<string, Map<string, UserEnvironment>> = new Map();
export default class MemoryPersister implements Persister {
  async GetUserAccount(username: string): Promise<UserAccount> {
    return {
      username,
      _id: username,
      password: "p4",
    };
  }

  async GetUserEnvironments(username: string): Promise<UserEnvironment[]> {
    const userEnvironment = userEnvironments.get(username);
    if (userEnvironment) {
      return [...userEnvironment.values()];
    }
    return [];
  }

  async AddUserEnvironment(
    username: string,
    identifier: string,
    description: string
  ): Promise<void> {
    if (
      userEnvironments.has(username) &&
      userEnvironments.get(username).has(identifier)
    ) {
      userEnvironments
        .get(username)
        .set(identifier, { identifier, description });
    }
  }

  async RemoveUserEnvironment(
    username: string,
    identifier: string
  ): Promise<void> {
    if (
      userEnvironments.has(username) &&
      userEnvironments.get(username).has(identifier)
    ) {
      userEnvironments.get(username).delete(identifier);
    }
  }

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
    return undefined;
  }
}
