import { ClientSession, MongoClient, ObjectID } from "mongodb";
import { hash } from "bcrypt";
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
import {
  Submission,
  SubmissionAdminOverviewEntry,
  SubmissionFileType,
  TerminalStateType,
} from "../Environment";
import environments from "../Configuration";

const saltRounds = 10;

export interface SubmissionEntry {
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

  async ChangeUserPassword(
    username: string,
    password: string
  ): Promise<UserAccount> {
    const passwordHash = await hash(password, saltRounds);
    const client = await this.getClient();
    return client
      .db()
      .collection("users")
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
      .collection("users")
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
      .collection("users")
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
      .collection("users")
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
        .collection("submissions")
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
        .collection("submissions")
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
        .collection("submissions")
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
        .collection("submissions")
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

  async GetAllUsers(): Promise<UserData[]> {
    const client = await this.getClient();
    return client
      .db()
      .collection("users")
      .find(
        {},
        {
          projection: {
            _id: 1,
            username: 1,
            groupNumber: 1,
            role: 1,
            courses: 1,
          },
        }
      )
      .toArray();
  }

  async GetAllCourses(): Promise<CourseData[]> {
    const client = await this.getClient();
    return client
      .db()
      .collection("courses")
      .find({}, { projection: { _id: 1, name: 1, assignments: 1 } })
      .toArray();
  }

  async AddCourseToUsers(
    userIDs: ObjectID[],
    courseID: ObjectID,
    session: ClientSession,
    client: MongoClient
  ): Promise<void> {
    return client
      .db()
      .collection("users")
      .updateMany(
        { _id: { $in: userIDs }, courses: { $ne: courseID } },
        { $addToSet: { courses: courseID } },
        { session }
      )
      .then(() => undefined);
  }

  async RemoveCourseFromUsers(
    userIDs: ObjectID[],
    courseID: ObjectID,
    session: ClientSession,
    client: MongoClient
  ): Promise<void> {
    return client
      .db()
      .collection("users")
      .updateMany(
        { _id: { $in: userIDs }, courses: courseID },
        { $pull: { courses: courseID } },
        { session }
      )
      .then(() => undefined);
  }

  async AddCourse(courseName: string): Promise<ResponseObject> {
    const client = await this.getClient();

    const result = await client
      .db()
      .collection("courses")
      .updateOne(
        { name: courseName },
        { $setOnInsert: { name: courseName } },
        { upsert: true }
      );

    try {
      if (result.upsertedCount === 0) {
        return { error: true, message: "Course already exists.", code: 409 };
      }
    } catch (err) {
      return { error: true, message: err.message, code: 500 };
    }

    return {
      error: false,
      message: `Course ${courseName} added.`,
      code: 200,
      id: result.upsertedId._id.toString() ?? undefined,
    };
  }

  async UpdateCourseForUsers(
    courseUserAction: {
      add: { userID: string }[];
      remove: { userID: string }[];
    },
    courseID: string
  ): Promise<ResponseObject> {
    const client = await this.getClient();
    const session = client.startSession();
    const response = { error: false, message: "Success" };

    const userIDsAdd: ObjectID[] = courseUserAction.add.map(
      (userObject) => new ObjectID(userObject.userID)
    );
    const userIDsRemove: ObjectID[] = courseUserAction.remove.map(
      (userObject) => new ObjectID(userObject.userID)
    );
    const courseIDObj = new ObjectID(courseID);

    try {
      await session.withTransaction(async () => {
        await this.AddCourseToUsers(userIDsAdd, courseIDObj, session, client);
        await this.RemoveCourseFromUsers(
          userIDsRemove,
          courseIDObj,
          session,
          client
        );
      });

      response.error = false;
    } catch (err) {
      console.log("Transaction aborted due to an unexpected error: " + err);
      response.error = true;
      response.message =
        "Transaction aborted due to an unexpected error: " + err;
    } finally {
      session.endSession();
      return response;
    }
  }

  async CreateAssignments(): Promise<AssignmentData[]> {
    const client = await this.getClient();

    const assignmentNames = Array.from(new Map(environments).keys());

    const assignmentsCollection = client.db().collection("assignments");

    // Create the assignments collection if it doesn't exist
    await assignmentsCollection.createIndex({ name: 1 }, { unique: true });

    // Insert assignment names into the collection
    const bulkWriteOperations = assignmentNames.map((name) => ({
      updateOne: {
        filter: { name },
        update: { $setOnInsert: { name } },
        upsert: true,
      },
    }));

    // Using bulkWrite as insertMany still throws errors on duplicate
    const result = await assignmentsCollection.bulkWrite(bulkWriteOperations);

    const insertedAssignments = assignmentNames.map((name, index) => ({
      _id: result.upsertedIds[index],
      name,
    }));

    return insertedAssignments;
  }

  async GetAllAssignments(): Promise<AssignmentData[] | string[]> {
    const client = await this.getClient();
    return client
      .db()
      .collection("assignments")
      .find({}, { projection: { _id: 1, name: 1 } })
      .toArray();
  }

  async UpdateAssignementsForCourse(
    courseID: string,
    assignmentIDs: string[]
  ): Promise<void> {
    const client = await this.getClient();
    const courseObjID = new ObjectID(courseID);
    const assignmentObjIDs = assignmentIDs.map((id) => new ObjectID(id));
    return client
      .db()
      .collection("courses")
      .updateOne(
        { _id: courseObjID },
        { $set: { assignments: assignmentObjIDs } }
      )
      .then(() => undefined);
  }

  async GetUserAssignments(userAcc: UserAccount): Promise<AssignmentData[]> {
    const client = await this.getClient();
    const courseObjIDs = userAcc.courses.map((id) => new ObjectID(id));

    return client
      .db()
      .collection("courses")
      .aggregate([
        { $match: { _id: { $in: courseObjIDs } } },
        {
          $lookup: {
            from: "assignments",
            localField: "assignments",
            foreignField: "_id",
            as: "assignments",
          },
        },
        { $unwind: "$assignments" },
        { $replaceRoot: { newRoot: "$assignments" } },
      ])
      .toArray();
  }

  async GetAllSubmissions(): Promise<SubmissionAdminOverviewEntry[]> {
    return new Promise<SubmissionAdminOverviewEntry[]>(
      async (resolve, reject) => {
        try {
          const client = await this.getClient();

          const allSubmissions = await client
            .db()
            .collection("submissions")
            .aggregate([
              { $unwind: "$submittedFiles" },
              { $unwind: "$terminalStatus" },
              {
                $group: {
                  _id: "$_id",
                  environment: { $first: "$environment" },
                  submissionCreated: { $first: "$submissionCreated" },
                  username: { $first: "$username" },
                  groupNumber: { $first: "$groupNumber" },
                  fileNames: { $addToSet: "$submittedFiles.fileName" },
                  terminalEndpoints: { $addToSet: "$terminalStatus.endpoint" },
                },
              },
            ])
            .sort({
              environment: 1,
              groupName: 1,
              username: 1,
              terminalEndpoints: 1,
            })
            .toArray();

          const submissions: SubmissionAdminOverviewEntry[] =
            allSubmissions.map((submission) => ({
              submissionID: submission._id,
              assignmentName: submission.environment,
              lastChanged: submission.submissionCreated,
              username: submission.username,
              groupNumber: submission.groupNumber,
              fileNames: submission.fileNames,
              terminalEndpoints: submission.terminalEndpoints,
            }));

          resolve(submissions);
        } catch (error) {
          reject(
            new Error(
              "Unable to retrieve submissions of user or group: " + error
            )
          );
        }
      }
    );
  }

  async GetSubmissionFile(
    submissionID: string,
    fileName: string
  ): Promise<FileData> {
    try {
      const client = await this.getClient();

      const submission = await client
        .db()
        .collection("submissions")
        .findOne({ _id: new ObjectID(submissionID) });

      if (!submission) {
        throw new Error("Submission not found");
      }

      const file = submission.submittedFiles.find(
        (file: { fileName: string }) => file.fileName === fileName
      );

      if (!file) {
        throw new Error("File not found in submission");
      }

      return {
        fileName: file.fileName,
        content: file.fileContent,
      };
    } catch (error) {
      throw new Error(`Unable to get submission file: ${error.message}`);
    }
  }

  async GetTerminalData(submissionID: string): Promise<TerminalStateType[]> {
    try {
      const client = await this.getClient();

      const submission = await client
        .db()
        .collection("submissions")
        .findOne({ _id: new ObjectID(submissionID) });

      if (!submission) {
        throw new Error("Submission not found");
      }

      const terminalStatusArray = submission.terminalStatus;

      if (!terminalStatusArray || terminalStatusArray.length === 0) {
        throw new Error("Terminal status data not found in submission");
      }

      const terminalData: TerminalStateType[] = terminalStatusArray.map(
        (status: TerminalStateType) => ({
          endpoint: status.endpoint,
          state: status.state,
        })
      );

      return terminalData;
    } catch (error) {
      throw new Error(`Unable to get terminal  file: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}
