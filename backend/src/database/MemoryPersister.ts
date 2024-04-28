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
    if (process.env.BACKEND_USER_MAPPING != undefined) {
      const userMappingConfig = process.env.BACKEND_USER_MAPPING.split(",");
      const usermap: Map<string, number> = new Map();
      userMappingConfig.forEach((userMappingConfigEntry) => {
        const login = userMappingConfigEntry.split(":")[0];
        const instanceNumber = userMappingConfigEntry.split(":")[1];
        usermap.set(login, parseInt(instanceNumber));
      });

      if (usermap.has(username)) {
        console.log(
          "Mapped user " +
            username +
            " to group number " +
            usermap.get(username)
        );
        return usermap.get(username);
      } else {
        throw new Error(
          "No mapping defined to map user " + username + " to a group."
        );
      }
    } else {
      console.log(
        "No BACKEND_USER_MAPPING environment variable set. Mapping user to group 0."
      );
      return 0;
    }
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
    environment: string,
    description: string,
    instance: string
  ): Promise<void> {
    if (!userEnvironments.has(username)) {
      userEnvironments.set(username, new Map<string, UserEnvironment>());
    }
    userEnvironments.get(username).set(environment, {
      environment,
      description,
      instance,
    });
  }

  async RemoveUserEnvironment(
    username: string,
    environment: string
  ): Promise<void> {
    if (
      userEnvironments.has(username) &&
      userEnvironments.get(username).has(environment)
    ) {
      userEnvironments.get(username).delete(environment);
    }
  }

  async SubmitUserEnvironment(
    username: string,
    groupNumber: number,
    environment: string,
    terminalStates: TerminalStateType[],
    submittedFiles: SubmissionFileType[]
  ): Promise<void> {
    console.log(
      "Storing assignment result for user: " +
        username +
        " assignment environment: " +
        environment +
        " terminalStates: " +
        terminalStates
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
          terminalState.endpoint.split("/").slice(-1) + "-output.txt"
        ),
        terminalState.state,
        "binary"
      );
    }

    for (const submissionFile of submittedFiles) {
      fs.writeFileSync(
        path.resolve(resultPath, submissionFile.fileName),
        submissionFile.fileContent,
        "binary"
      );
    }
  }

  async GetUserSubmissions(
    username: string,
    groupNumber: number
  ): Promise<Submission[]> {
    const group = "group" + groupNumber;
    const submissions: Array<Submission> = [];
    const resultPathRoot = path.resolve("src", "assignments", "results");
    if (fs.existsSync(resultPathRoot)) {
      const submissionDirs = fs.readdirSync(resultPathRoot);
      submissionDirs.forEach(function (submissionDir) {
        if (
          submissionDir.match(username + "-(.*)") ||
          submissionDir.match("(.*)-" + group + "-(.*)")
        ) {
          const files = fs.readdirSync(
            path.resolve(resultPathRoot, submissionDir)
          );
          const lastMTime = fs.statSync(
            path.resolve(resultPathRoot, submissionDir, files.pop())
          ).mtime;
          let assignmentName = submissionDir;
          if (submissionDir.match(username + "-(.*)")) {
            assignmentName = submissionDir.substring(username.length + 1);
          } else if (submissionDir.match("(.*)-" + group + "-(.*)")) {
            assignmentName = submissionDir.substring(username.length + 1);
          }
          const submission: Submission = {
            assignmentName: assignmentName,
            lastChanged: lastMTime,
          };
          submissions.push(submission);
        }
      });
      // console.log(
      //   "Retrieved submissions for user: " +
      //     username +
      //     " in group: " +
      //     group +
      //     " result: " +
      //     JSON.stringify(submissions)
      // );
      return submissions;
    }
  }

  async GetAllUsers(): Promise<UserData[]> {
    // TODO: implement
    throw new Error("Method not implemented.");
  }

  async GetAllCourses(): Promise<CourseData[]> {
    // TODO: implement
    throw new Error("Method not implemented.");
  }

  async AddCourse(courseName: string): Promise<ResponseObject> {
    throw new Error("Method not implemented.");
  }

  async UpdateCourseForUsers(
    courseUserAction: {
      add: { userID: string }[];
      remove: { userID: string }[];
    },
    courseID: string
  ): Promise<ResponseObject> {
    throw new Error("Method not implemented.");
  }

  async CreateAssignments(): Promise<AssignmentData[]> {
    throw new Error("Method not implemented.");
  }

  async GetAllAssignments(): Promise<AssignmentData[] | string[]> {
    throw new Error("Method not implemented.");
  }

  async UpdateAssignementsForCourse(
    courseID: string,
    assignmentIDs: string[]
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async GetUserAssignments(userAcc: UserAccount): Promise<AssignmentData[]> {
    throw new Error("Method not implemented.");
  }

  async GetAllSubmissions(): Promise<SubmissionAdminOverviewEntry[]> {
    throw new Error("Method not implemented.");
  }

  async GetSubmissionFile(
    submissionID: string,
    fileName: string
  ): Promise<FileData> {
    throw new Error("Method not implemented.");
  }

  async UpdateSubmissionPoints(
    submissionID: string,
    points: number
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async GetTerminalData(submissionID: string): Promise<TerminalStateType[]> {
    throw new Error("Method not implemented.");
  }

  async LoadEnvironments(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async close(): Promise<void> {
    return undefined;
  }
}
