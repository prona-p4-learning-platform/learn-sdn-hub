import {
  AssignmentStep,
  Submission,
  SubmissionAdminOverviewEntry,
  SubmissionFileType,
  TerminalStateType,
} from "../Environment";

export interface UserEntry {
  _id?: string;
  username: string;
  password?: string;
  passwordHash?: string;
  groupNumber: number;
  assignmentListFilter?: string;
  environments: UserEnvironment[];
  externalIds: UserExternalId[];
  examStartTime?: Date;
}

export interface UserAccount {
  _id: string;
  username: string;
  groupNumber: number;
  password?: string;
  passwordHash?: string;
  assignmentListFilter?: string;
  role?: string;
  courses?: string[];
  examStartTime?: Date;
}

export interface UserExternalId {
  externalId: string;
  authProvider: string;
}

export interface UserEnvironment {
  environment: string;
  description: string;
  instance: string;
  ipAddress: string;
  port: number | undefined;
}

export interface AssignmentUpdate extends LabSheet {
  _id: string;
  name?: string;
  maxBonusPoints?: number;
  assignmentLabSheet?: string;
  description?: string;
}

export interface LabSheet {
  _sheetId?: string;
  labSheetName?: string;
  labSheetContent?: string;
}

export interface AssignmentDelete {
  _id: string;
  _sheetId?: string;
}

export interface UserData {
  _id: string;
  username: string;
  groupNumber: number;
  role: string;
  courses: string[];
}

export interface CourseData {
  _id: string;
  name: string;
  assignments: string[];
}

export interface ResponseObject {
  error: boolean;
  message: string;
  code?: number;
  id?: string;
}

export interface AssignmentData {
  _id: string;
  name: string;
  steps?: Array<AssignmentStep>;
  maxBonusPoints?: number;
  assignmentLabSheet?: string;
  labSheetName?: string;
  sheetId?: string;
  assignmentLabSheetLocation?: "backend" | "instance" | "database";
}

export interface FileData {
  fileName: string;
  content: string;
}

export type CourseUserAction = {
  [key in "add" | "remove"]: {
    userID: string;
  }[];
};

export interface Persister {
  GetUserAccount: (username: string) => Promise<UserAccount>;
  GetUserAccountByExternalId: (
    externalId: UserExternalId,
  ) => Promise<UserAccount>;
  CreateUserAccount: (userEntry: UserEntry) => Promise<ResponseObject>;
  AddUserExternalId: (
    username: string,
    externalId: UserExternalId,
  ) => Promise<void>;
  GetUserEnvironments: (username: string) => Promise<UserEnvironment[]>;
  AddUserEnvironment: (
    username: string,
    environment: string,
    description: string,
    instance: string,
    ipAddress: string,
    port: number | undefined,
  ) => Promise<void>;
  RemoveUserEnvironment: (
    username: string,
    environment: string,
  ) => Promise<void>;
  SubmitUserEnvironment: (
    username: string,
    groupNumber: number,
    environment: string,
    terminalStates: TerminalStateType[],
    submittedFiles: SubmissionFileType[],
    bonusPoints: number
  ) => Promise<void>;
  GetUserSubmissions: (
    username: string,
    groupNumber: number,
  ) => Promise<Submission[]>;
  GetAllUsers: () => Promise<UserData[]>;
  GetAllCourses: () => Promise<CourseData[]>;
  GetActiveEnvironments: () => Promise<UserEntry[]>;
  GetAllSubmissions: () => Promise<SubmissionAdminOverviewEntry[]>;
  AddCourse: (courseName: string) => Promise<ResponseObject>;
  UpdateCourseForUsers(
    courseUserAction: CourseUserAction,
    courseID: string,
  ): Promise<ResponseObject>;
  CreateAssignments(): Promise<AssignmentData[]>;
  CreateAssignment(assignment: { name: string; maxBonusPoints?: number; assignmentLabSheet?: string, labSheetName?: string }): Promise<AssignmentData>;
  UpdateAssignment(update: AssignmentUpdate): Promise<void>;
  DeleteAssignment(assignment: AssignmentDelete): Promise<void>;
  GetAllAssignments(): Promise<AssignmentData[] | string[]>;
  GetLabSheetContent(sheetId: string): Promise<LabSheet | null>;
  GetUserAssignments(userAcc: UserAccount): Promise<AssignmentData[]>;
  UpdateAssignementsForCourse(
    courseID: string,
    assignmentIDs: string[],
  ): Promise<void>;
  GetSubmissionFile(submissionID: string, fileName: string): Promise<FileData>;
  UpdateSubmissionPoints(submissionID: string, points: number): Promise<void>;
  GetTerminalData(submissionID: string): Promise<TerminalStateType[]>;
  LoadEnvironments(): Promise<void>;
}
