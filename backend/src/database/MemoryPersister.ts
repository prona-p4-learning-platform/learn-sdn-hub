/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Persister,
  UserEnvironment,
  UserAccount,
  UserData,
  CourseData,
  ResponseObject,
  AssignmentData,
  FileData,
} from "./Persister";
import fs from "fs";
import path from "path";
import {
  TerminalStateType,
  Submission,
  SubmissionFileType,
  SubmissionAdminOverviewEntry,
} from "../Environment";

const userEnvironments = new Map<string, Map<string, UserEnvironment>>();

export default class MemoryPersister implements Persister {
  GetUserAccount(username: string): Promise<UserAccount> {
    return new Promise((resolve, reject) => {
      try {
        const groupNumber = this.getUserMapping(username);
        const account: UserAccount = {
          _id: username,
          username,
          groupNumber,
          password: "p4",
        };

        resolve(account);
      } catch (error) {
        if (error instanceof Error) reject(error);
        else reject(new Error("MemoryPersister: Cannot get user account."));
      }
    });
  }

  getUserMapping(username: string): number {
    if (process.env.BACKEND_USER_MAPPING) {
      const userMappingConfig = process.env.BACKEND_USER_MAPPING.split(",");
      const usermap = new Map<string, number>();

      for (const userMappingConfigEntry of userMappingConfig) {
        const [login, instanceNumber] = userMappingConfigEntry.split(":");

        usermap.set(login, parseInt(instanceNumber));
      }

      const map = usermap.get(username);
      if (map !== undefined) {
        console.log(
          `MemoryPersister: Mapped user ${username} to group number ${map}`,
        );

        return map;
      } else {
        throw new Error(
          `MemoryPersister: No mapping defined to map user ${username} to a group.`,
        );
      }
    } else {
      console.log(
        "MemoryPersister: No BACKEND_USER_MAPPING environment variable set. Mapping user to group 0.",
      );

      return 0;
    }
  }

  GetUserEnvironments(username: string): Promise<UserEnvironment[]> {
    return new Promise((resolve) => {
      const userEnvironment = userEnvironments.get(username);
      const result = userEnvironment
        ? Array.from(userEnvironment.values())
        : [];

      resolve(result);
    });
  }

  AddUserEnvironment(
    username: string,
    environment: string,
    description: string,
    instance: string,
  ): Promise<void> {
    return new Promise((resolve) => {
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

      resolve();
    });
  }

  RemoveUserEnvironment(username: string, environment: string): Promise<void> {
    return new Promise((resolve) => {
      userEnvironments.get(username)?.delete(environment);

      resolve();
    });
  }

  SubmitUserEnvironment(
    username: string,
    groupNumber: number,
    environment: string,
    terminalStates: TerminalStateType[],
    submittedFiles: SubmissionFileType[],
  ): Promise<void> {
    return new Promise((resolve) => {
      console.log(
        `Storing assignment result for user: ${username} assignment environment: ${environment} terminalStates: ${terminalStates
          .map((val) => {
            return val.state || "Unknown";
          })
          .join(", ")}`,
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
            terminalState.endpoint.split("/").slice(-1).join("-") +
              "-output.txt",
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

      resolve();
    });
  }

  GetUserSubmissions(
    username: string,
    groupNumber: number,
  ): Promise<Submission[]> {
    return new Promise((resolve) => {
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
      }

      resolve(submissions);
    });
  }

  GetAllUsers(): Promise<UserData[]> {
    // TODO: implement
    throw new Error("Method not implemented.");
  }

  GetAllCourses(): Promise<CourseData[]> {
    // TODO: implement
    throw new Error("Method not implemented.");
  }

  AddCourse(_courseName: string): Promise<ResponseObject> {
    throw new Error("Method not implemented.");
  }

  UpdateCourseForUsers(
    _courseUserAction: {
      add: { userID: string }[];
      remove: { userID: string }[];
    },
    _courseID: string,
  ): Promise<ResponseObject> {
    throw new Error("Method not implemented.");
  }

  CreateAssignments(): Promise<AssignmentData[]> {
    throw new Error("Method not implemented.");
  }

  GetAllAssignments(): Promise<AssignmentData[] | string[]> {
    throw new Error("Method not implemented.");
  }

  UpdateAssignementsForCourse(
    _courseID: string,
    _assignmentIDs: string[],
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  GetUserAssignments(_userAcc: UserAccount): Promise<AssignmentData[]> {
    throw new Error("Method not implemented.");
  }

  GetAllSubmissions(): Promise<SubmissionAdminOverviewEntry[]> {
    throw new Error("Method not implemented.");
  }

  GetSubmissionFile(
    _submissionID: string,
    _fileName: string,
  ): Promise<FileData> {
    throw new Error("Method not implemented.");
  }

  UpdateSubmissionPoints(
    _submissionID: string,
    _points: number,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  GetTerminalData(_submissionID: string): Promise<TerminalStateType[]> {
    throw new Error("Method not implemented.");
  }

  LoadEnvironments(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}
