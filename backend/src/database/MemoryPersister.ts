import { Persister, UserEnvironment, UserAccount } from "./Persister";
import fs from "fs";
import path from "path";
import {
  TerminalStateType,
  Submission,
  SubmissionFileType,
} from "../Environment";

const userEnvironments: Map<string, Map<string, UserEnvironment>> = new Map();
export default class MemoryPersister implements Persister {
  async GetUserAccount(username: string): Promise<UserAccount> {
    return {
      _id: username,
      username,
      groupNumber: await this.getUserMapping(username),
      password: "p4",
    };
  }

  async getUserMapping(username: string): Promise<number> {
    if (process.env.BACKEND_USER_MAPPING) {
      const userMappingConfig = process.env.BACKEND_USER_MAPPING.split(",");
      const usermap = new Map<string, number>();

      for (const userMappingConfigEntry of userMappingConfig) {
        const split = userMappingConfigEntry.split(":");
        const login = split[0];
        const instanceNumber = split[1];

        usermap.set(login, parseInt(instanceNumber));
      }

      const map = usermap.get(username);
      if (map !== undefined) {
        console.log("Mapped user " + username + " to group number " + map);

        return Promise.resolve(map);
      } else {
        return Promise.reject(
          new Error(
            "No mapping defined to map user " + username + " to a group.",
          ),
        );
      }
    } else {
      console.log(
        "No BACKEND_USER_MAPPING environment variable set. Mapping user to group 0.",
      );

      return Promise.resolve(0);
    }
  }

  async GetUserEnvironments(username: string): Promise<UserEnvironment[]> {
    const userEnvironment = userEnvironments.get(username);
    const result = userEnvironment ? Array.from(userEnvironment.values()) : [];

    return Promise.resolve(result);
  }

  async AddUserEnvironment(
    username: string,
    environment: string,
    description: string,
    instance: string,
  ): Promise<void> {
    let userEnv = userEnvironments.get(username);

    if (!userEnv) {
      userEnv = new Map<string, UserEnvironment>();
      userEnvironments.set(username, userEnv);
    }

    userEnv.set(environment, {
      environment,
      description,
      instance,
    });

    return Promise.resolve();
  }

  async RemoveUserEnvironment(
    username: string,
    environment: string,
  ): Promise<void> {
    userEnvironments.get(username)?.delete(environment);

    return Promise.resolve();
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
        terminalStates,
    );
    const resultPathRoot = path.resolve("src", "assignments", "results");
    !fs.existsSync(resultPathRoot) && fs.mkdirSync(resultPathRoot);

    const resultDirName = username + "-" + groupNumber + "-" + environment;
    const resultPath = path.resolve(resultPathRoot, resultDirName);
    !fs.existsSync(resultPath) && fs.mkdirSync(resultPath);

    for (const terminalState of terminalStates) {
      fs.writeFileSync(
        path.resolve(
          resultPath,
          terminalState.endpoint.split("/").slice(-1) + "-output.txt",
        ),
        terminalState.state,
        "binary",
      );
    }

    for (const submissionFile of submittedFiles) {
      fs.writeFileSync(
        path.resolve(resultPath, submissionFile.fileName),
        submissionFile.fileContent,
        "binary",
      );
    }
  }

  async GetUserSubmissions(
    username: string,
    groupNumber: number,
  ): Promise<Submission[]> {
    const group = "group" + groupNumber;
    const submissions: Submission[] = [];
    const resultPathRoot = path.resolve("src", "assignments", "results");

    if (fs.existsSync(resultPathRoot)) {
      const submissionDirs = fs.readdirSync(resultPathRoot);

      for (const submissionDir of submissionDirs) {
        if (
          submissionDir.match(username + "-(.*)") ||
          submissionDir.match("(.*)-" + group + "-(.*)")
        ) {
          const files = fs.readdirSync(
            path.resolve(resultPathRoot, submissionDir),
          );
          const file = files.pop();
          const lastMTime = file
            ? fs.statSync(path.resolve(resultPathRoot, submissionDir, file))
                .mtime
            : new Date(0);
          let assignmentName = submissionDir;

          if (submissionDir.match(username + "-(.*)")) {
            assignmentName = submissionDir.substring(username.length + 1);
          } else if (submissionDir.match("(.*)-" + group + "-(.*)")) {
            assignmentName = submissionDir.substring(username.length + 1);
          }

          const submission = {
            assignmentName: assignmentName,
            lastChanged: lastMTime,
          };

          submissions.push(submission);
        }
      }
      // console.log(
      //   "Retrieved submissions for user: " +
      //     username +
      //     " in group: " +
      //     group +
      //     " result: " +
      //     JSON.stringify(submissions)
      // );
    }

    return Promise.resolve(submissions);
  }

  async close(): Promise<void> {
    return Promise.resolve();
  }
}
