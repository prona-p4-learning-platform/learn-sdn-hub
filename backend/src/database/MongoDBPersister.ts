import { ClientSession, MongoClient, ObjectId, PullOperator } from "mongodb";
import { hash } from "@node-rs/bcrypt";
import {
  AssignmentData,
  AssignmentDelete,
  AssignmentUpdate,
  CourseData,
  FileData,
  LabSheet,
  Persister,
  ResponseObject,
  UserAccount,
  UserData,
  UserEntry,
  UserEnvironment,
  UserExternalId,
} from "./Persister";
import {
  EnvironmentDescription,
  Submission,
  SubmissionAdminOverviewEntry,
  SubmissionFileType,
  TerminalStateType,
} from "../Environment";
import environments, { updateEnvironments } from "../Configuration";

const saltRounds = 10;

interface EnvironmentDocument extends EnvironmentDescription {
  _id: string;
  name: string;
}

export interface SubmissionEntry {
  _id?: string;
  username: string;
  groupNumber: number;
  environment: string;
  submissionCreated: Date;
  terminalStatus: TerminalStateType[];
  submittedFiles: SubmissionFileType[];
  points?: number;
}

export type MongoAssignment = Omit<NewAssignment, "_id" | "sheetId"> & {
  _id: ObjectId;
  sheetId?: ObjectId;
};

interface NewAssignment {
  _id: ObjectId;
  name: string;
  assignmentLabSheet?: string | undefined;
  labSheetName?: string | undefined;
  maxBonusPoints?: number | undefined;
}

interface MongoLabSheet {
  _id: ObjectId;
  name: string;
  content: string;
}

interface SubmissionAdminEntry extends SubmissionEntry {
  fileNames: string[];
  terminalEndpoints: string[];
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

  async GetUserAccountByExternalId(
    externalId: UserExternalId,
  ): Promise<UserAccount> {
    const client = await this.getClient();
    const result = await client.db().collection<UserEntry>("users").findOne({
      "externalIds.authProvider": externalId.authProvider,
      "externalIds.externalId": externalId.externalId,
    });

    if (result) return result;
    else throw new Error("MongoDBPersister: UserAccount not found.");
  }

  async CreateUserAccount(userEntry: UserEntry): Promise<ResponseObject> {
    const promises =
      userEntry.externalIds?.map(async (externalId) => {
        try {
          return await this.GetUserAccountByExternalId(externalId);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          return null;
        }
      }) ?? [];

    promises.push(
      (async () => {
        try {
          return await this.GetUserAccount(userEntry.username);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          return null;
        }
      })(),
    );

    const results = await Promise.all(promises); // Wait for all promises to resolve

    // Filter out null values (if any)
    const accountList = results.filter((result) => result !== null);
    if (accountList.length > 0) {
      throw new Error(
        `MongoDBPersister: UserAccount with username ${userEntry.username} or one of the external ids ${JSON.stringify(userEntry?.externalIds)} already exists.`,
      );
    }

    const client = await this.getClient();
    const result = await client
      .db()
      .collection<UserEntry>("users")
      .insertOne(userEntry);

    if (result)
      return {
        error: false,
        message: `User ${userEntry.username} created.`,
        code: 200,
        id: result.insertedId,
      };
    else throw new Error("MongoDBPersister: UserAccount couldn't be created.");
  }

  async AddUserExternalId(
    username: string,
    externalId: UserExternalId,
  ): Promise<void> {
    const client = await this.getClient();
    const user = await client
      .db()
      .collection<UserEntry>("users")
      .findOne({ username });

    if (!user) {
      throw new Error("MongoDBPersister: UserAccount was not found.");
    }

    if (
      user.externalIds?.find(
        (id) => id.authProvider === externalId.authProvider,
      )
    ) {
      throw new Error(
        "MongoDBPersister: UserAccount already has external id with the auth provider.",
      );
    }
    const result = await client
      .db()
      .collection<UserEntry>("users")
      .updateOne(
        { _id: user._id },
        { $set: { externalIds: [...(user.externalIds ?? []), externalId] } },
      );
    if (result.acknowledged) {
      console.log("MongoDBPersister: Updated externals ids on user account");
    }
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
        return result && result.environments ? result.environments : [];
      });
  }

  async AddUserEnvironment(
    username: string,
    environment: string,
    description: string,
    instance: string,
    ipAddress: string,
    port: number | undefined,
  ): Promise<void> {
    const client = await this.getClient();
    await client
      .db()
      .collection<UserEntry>("users")
      .findOneAndUpdate(
        { username, "environments.environment": { $ne: environment } },
        { $push: { environments: { environment, description, instance, ipAddress, port } } },
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
        " terminalStates (endpoint,state): " +
        terminalStates.map((ts) => `(${ts.endpoint},${ts.state})`).join(","),
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
            points: submission.points,
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

  async GetAllUsers(): Promise<UserData[]> {
    const client = await this.getClient();
    return client
      .db()
      .collection<UserData>("users")
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
        },
      )
      .toArray();
  }

  async GetActiveEnvironments(): Promise<UserEntry[]> {
    const client = await this.getClient();
    const users = await client
      .db()
      .collection<UserEntry>("users")
      .find(
        {
          environments: { $exists: true, $ne: [] },
        },
        {
          projection: {
            _id: 1,
            username: 1,
            groupNumber: 1,
            environments: 1,
          },
        },
      )
      .toArray();

    return users.map(user => ({
      ...user,
      environmentIPs: user.environments.map(env => env.ipAddress),
    }));
  }

  async GetAllCourses(): Promise<CourseData[]> {
    const client = await this.getClient();
    return client
      .db()
      .collection<CourseData>("courses")
      .find({}, { projection: { _id: 1, name: 1, assignments: 1 } })
      .toArray();
  }

  async AddCourseToUsers(
    userIDs: ObjectId[],
    courseID: ObjectId,
    session: ClientSession,
    client: MongoClient,
  ): Promise<void> {
    return client
      .db()
      .collection("users")
      .updateMany(
        { _id: { $in: userIDs }, courses: { $ne: courseID } },
        { $addToSet: { courses: courseID } },
        { session },
      )
      .then(() => undefined);
  }

  async RemoveCourseFromUsers(
    userIDs: ObjectId[],
    courseID: ObjectId,
    session: ClientSession,
    client: MongoClient,
  ): Promise<void> {
    const pullQuery: PullOperator<Document> = { courses: [courseID] };

    return client
      .db()
      .collection("users")
      .updateMany(
        { _id: { $in: userIDs }, courses: courseID },
        { $pull: pullQuery },
        { session },
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
        { upsert: true },
      );

    try {
      if (result.upsertedCount === 0) {
        return { error: true, message: "Course already exists.", code: 409 };
      }
    } catch (err) {
      if (err instanceof Error) {
        return { error: true, message: err.message, code: 500 };
      }
    }

    return {
      error: false,
      message: `Course ${courseName} added.`,
      code: 200,
      id: result?.upsertedId?.toString() ?? undefined,
    };
  }

  async UpdateCourseForUsers(
    courseUserAction: {
      add: { userID: string }[];
      remove: { userID: string }[];
    },
    courseID: string,
  ): Promise<ResponseObject> {
    const client = await this.getClient();
    const session = client.startSession();
    const response = { error: false, message: "Success" };

    const userIDsAdd: ObjectId[] = courseUserAction.add.map(
      (userObject) => new ObjectId(userObject.userID),
    );
    const userIDsRemove: ObjectId[] = courseUserAction.remove.map(
      (userObject) => new ObjectId(userObject.userID),
    );
    const courseIDObj = new ObjectId(courseID);

    try {
      await session.withTransaction(async () => {
        await this.AddCourseToUsers(userIDsAdd, courseIDObj, session, client);
        await this.RemoveCourseFromUsers(
          userIDsRemove,
          courseIDObj,
          session,
          client,
        );
      });

      response.error = false;
    } catch (err) {
      console.log(
        "Transaction aborted due to an unexpected error: " + String(err),
      );
      response.error = true;
      response.message =
        "Transaction aborted due to an unexpected error: " + String(err);
    } finally {
      await session.endSession();
    }
    return response;
  }

  async LoadEnvironments(): Promise<void> {
    const client = await this.getClient();
    const environmentsCollection = client
      .db()
      .collection<EnvironmentDocument>("assignments");

    const environmentDocs = await environmentsCollection.find().toArray();

    const environmentMap = new Map<string, EnvironmentDescription>();

    // Transform the MongoDB documents into a Map<string, EnvironmentDescription>
    environmentDocs.forEach((doc) => {
      environmentMap.set(doc.name, doc as EnvironmentDescription);
    });

    // Update the global environments map
    updateEnvironments(environmentMap);
  }

  async CreateAssignments(): Promise<AssignmentData[]> {
    const client = await this.getClient();

    const assignmentNames = Array.from(new Map(environments).keys());

    const assignmentsCollection = client.db().collection("assignments");

    // Create the assignments collection if it doesn't exist
    await assignmentsCollection.createIndex({ name: 1 }, { unique: true });

    const assignmentsToInsert = Array.from(environments.entries()).map(
      ([name, env]) => ({
        name: name,
        ...env,
      }),
    );

    // Insert assignments into the collection
    const bulkWriteOperations = assignmentsToInsert.map((assignment) => ({
      updateOne: {
        filter: { name: assignment.name },
        update: { $setOnInsert: assignment },
        upsert: true,
      },
    }));

    // Using bulkWrite as insertMany still throws errors on duplicate
    const result = await assignmentsCollection.bulkWrite(bulkWriteOperations);

    const insertedAssignments = assignmentNames.map((name, index) => ({
      _id: result.upsertedIds[index] as string,
      name,
    }));

    return insertedAssignments;
  }

  async CreateAssignment(assignment: NewAssignment): Promise<AssignmentData> {
    const client = await this.getClient();
    const sheetsCollection = client
      .db()
      .collection("assignmentLabSheets");
    const assignmentsCollection = client.db().collection("assignments");

    await assignmentsCollection.createIndex({ name: 1 }, { unique: true });

    const existing = await assignmentsCollection.findOne({ name: assignment.name });
    if (existing) {
      throw new Error(`Assignment with name "${assignment.name}" already exists`);
    }

    let sheetId: ObjectId | undefined;
    if (assignment.assignmentLabSheet) {
      const sheetResult = await sheetsCollection.insertOne({
        name: assignment.labSheetName,
        content: assignment.assignmentLabSheet,
      });
      sheetId = sheetResult.insertedId;
    }

    const assignmentToInsert = {
      name: assignment.name,
      assignmentLabSheetLocation: "database",
      ...(assignment.maxBonusPoints !== undefined && { maxBonusPoints: assignment.maxBonusPoints }),
      ...(assignment.assignmentLabSheet !== undefined && { assignmentLabSheet: assignment.assignmentLabSheet }),
      ...(sheetId && { sheetId }),
    };

    const result = await assignmentsCollection.insertOne(assignmentToInsert);

    const insertedAssignment = await assignmentsCollection.findOne<MongoAssignment>({
      _id: result.insertedId,
    });

    if (!insertedAssignment) {
      throw new Error("Failed to create assignment");
    }

    return {
      _id: insertedAssignment._id.toString(),
      name: insertedAssignment.name,
      maxBonusPoints: insertedAssignment.maxBonusPoints ?? undefined,
      assignmentLabSheet: insertedAssignment.assignmentLabSheet ?? undefined,
    };
  }

  async DeleteAssignment(assignment: AssignmentDelete): Promise<void> {
    const client = await this.getClient();

    const { _id, _sheetId } = assignment;

    if (!_id) {
      throw new Error("DeleteAssignment called without _id");
    }

    const assignmentId = new ObjectId(_id);
    const labSheetId = _sheetId ? new ObjectId(_sheetId) : null;
    const assignmentResult = await client
      .db()
      .collection("assignments")
      .deleteOne({ _id: assignmentId });

    if (assignmentResult.deletedCount === 0) {
      throw new Error(`Assignment with id ${_id} not found`);
    }

    if (labSheetId) {
      const sheetResult = await client
        .db()
        .collection("assignmentLabSheets")
        .deleteOne({ _id: labSheetId });

      if (sheetResult.deletedCount === 0) {
        console.warn(`LabSheet with id ${_sheetId} not found`);
      }
    }
  }

  async UpdateAssignment(update: AssignmentUpdate): Promise<void> {
    const client = await this.getClient();

    const { _id, _sheetId, description, maxBonusPoints, name, labSheetContent, labSheetName } = update;
    const assignmentId = new ObjectId(_id);
    const labSheetId = new ObjectId(_sheetId);

    console.log("UpdateAssignment", update);

    await client
      .db()
      .collection("assignments")
      .updateOne(
        { _id: assignmentId },
        { $set: { description: description, maxBonusPoints: maxBonusPoints, name: name }},
      )
      .then(() => undefined)

    await client
      .db()
      .collection("assignmentLabSheets")
      .updateOne(
        { _id: labSheetId },
        { $set: { content: labSheetContent, name: labSheetName }},
      )
  }

  async GetAllAssignments(): Promise<AssignmentData[]> {
    const client = await this.getClient();
    const assignments = await client
      .db()
      .collection<AssignmentData>("assignments")
      .find(
        {},
        {
          projection: {
            _id: 1,
            name: 1,
            maxBonusPoints: 1,
            assignmentLabSheet: 1,
            sheetId: 1,
            assignmentLabSheetLocation: 1,
          },
        }
      )
      .toArray();

    return assignments.map(a => ({
      _id: a._id,
      name: a.name,
      maxBonusPoints: a.maxBonusPoints ?? undefined,
      assignmentLabSheet: a.assignmentLabSheet ?? undefined,
      sheetId: a.sheetId ?? undefined,
      assignmentLabSheetLocation: (a.assignmentLabSheetLocation as "backend" | "instance" | "database") ?? undefined,
    }));
  }

  async GetLabSheetContent(sheetId: string): Promise<LabSheet | null> {
    const client = await this.getClient();

    const doc = await client
      .db()
      .collection<MongoLabSheet>("assignmentLabSheets")
      .findOne(
        { _id: new ObjectId(sheetId) },
        { projection: { _id: 1, name: 1, content: 1 } }
      );

    if (!doc) return null;

    return {
      _sheetId: doc._id.toString(),
      labSheetName: doc.name,
      labSheetContent: doc.content,
    };
  }

  async UpdateAssignementsForCourse(
    courseID: string,
    assignmentIDs: string[],
  ): Promise<void> {
    const client = await this.getClient();
    const courseObjID = new ObjectId(courseID);
    const assignmentObjIDs = assignmentIDs.map((id) => new ObjectId(id));
    return client
      .db()
      .collection("courses")
      .updateOne(
        { _id: courseObjID },
        { $set: { assignments: assignmentObjIDs } },
      )
      .then(() => undefined);
  }

  async GetUserAssignments(userAcc: UserAccount): Promise<AssignmentData[]> {
    const client = await this.getClient();
    const courseObjIDs = userAcc.courses?.map((id) => new ObjectId(id));

    return client
      .db()
      .collection<AssignmentData>("courses")
      .aggregate<AssignmentData>([
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
    try {
      const client = await this.getClient();

      const allSubmissions = await client
        .db()
        .collection<SubmissionAdminEntry>("submissions")
        .aggregate<SubmissionAdminEntry>([
          {
            $unwind: {
              path: "$submittedFiles",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$terminalStatus",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: "$_id",
              environment: { $first: "$environment" },
              submissionCreated: { $first: "$submissionCreated" },
              username: { $first: "$username" },
              groupNumber: { $first: "$groupNumber" },
              fileNames: { $addToSet: "$submittedFiles.fileName" },
              terminalEndpoints: { $addToSet: "$terminalStatus.endpoint" },
              points: { $first: { $ifNull: ["$points", null] } },
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

      const submissions: SubmissionAdminOverviewEntry[] = allSubmissions.map(
        (submission) => ({
          submissionID: submission._id as string,
          assignmentName: submission.environment,
          lastChanged: submission.submissionCreated,
          username: submission.username,
          groupNumber: Number(submission.groupNumber),
          fileNames: submission.fileNames,
          terminalEndpoints: submission.terminalEndpoints,
          ...(submission.points !== null && {
            points: submission.points as number,
          }),
        }),
      );

      return submissions;
    } catch (error) {
      throw new Error(
        "Unable to retrieve submissions of user or group: " + String(error),
      );
    }
  }

  async GetSubmissionFile(
    submissionID: string,
    fileName: string,
  ): Promise<FileData> {
    try {
      const client = await this.getClient();

      const submission = await client
        .db()
        .collection("submissions")
        .findOne({ _id: new ObjectId(submissionID) });

      if (!submission) {
        throw new Error("Submission not found");
      }

      const file = (
        submission.submittedFiles as { fileName: string; fileContent: string }[]
      ).find((file) => file.fileName === fileName) as {
        fileName: string;
        fileContent: string;
      };

      if (!file) {
        throw new Error("File not found in submission");
      }

      return {
        fileName: file.fileName,
        content: file.fileContent,
      };
    } catch (error) {
      if (error instanceof Error)
        throw new Error(`Unable to get submission file: ${error.message}`);
    }
    return { fileName: "", content: "" };
  }

  async UpdateSubmissionPoints(
    submissionID: string,
    points: number,
  ): Promise<void> {
    const client = await this.getClient();
    const courseObjID = new ObjectId(submissionID);
    return client
      .db()
      .collection("submissions")
      .updateOne({ _id: courseObjID }, { $set: { points: points } })
      .then((data) => {
        if (data.modifiedCount === 0) {
          throw new Error("Could not update points for submission");
        }
      });
  }

  async GetTerminalData(submissionID: string): Promise<TerminalStateType[]> {
    try {
      const client = await this.getClient();

      const submission = await client
        .db()
        .collection("submissions")
        .findOne({ _id: new ObjectId(submissionID) });

      if (!submission) {
        throw new Error("Submission not found");
      }

      const terminalStatusArray =
        submission.terminalStatus as TerminalStateType[];

      if (!terminalStatusArray || terminalStatusArray.length === 0) {
        throw new Error("Terminal status data not found in submission");
      }

      const terminalData: TerminalStateType[] = terminalStatusArray.map(
        (status: TerminalStateType) => ({
          endpoint: status.endpoint,
          state: status.state,
        }),
      );

      return terminalData;
    } catch (error) {
      if (error instanceof Error)
        throw new Error(`Unable to get terminal  file: ${error.message}`);
    }
    return [];
  }

  async close(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}
