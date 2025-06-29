import {
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
}

export interface UserExternalId {
  externalId: string;
  authProvider: string;
}

export interface UserEnvironment {
  environment: string;
  description: string;
  instance: string;
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
  maxBonusPoints?: number;
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
  GetUserAccountByExternalId: (externalId: UserExternalId) => Promise<UserAccount>;
  CreateUserAccount: (userEntry: UserEntry) => Promise<ResponseObject>;
  AddUserExternalId: (username: string, externalId: UserExternalId) => Promise<void>;
  GetUserEnvironments: (username: string) => Promise<UserEnvironment[]>;
  AddUserEnvironment: (
    username: string,
    environment: string,
    description: string,
    instance: string,
  ) => Promise<void>;
  RemoveUserEnvironment: (
    username: string,
    environment: string,
  ) => Promise<void>;
  CreateUserSubmission: (
    username: string,
    groupNumber: number,
    environment: string,
    terminalStates: TerminalStateType[],
    submittedFiles: SubmissionFileType[],
  ) => Promise<void>;
  GetUserSubmissions: (
    username: string,
    groupNumber: number,
  ) => Promise<Submission[]>;
  GetAllUsers: () => Promise<UserData[]>;
  GetAllCourses: () => Promise<CourseData[]>;
  GetAllSubmissions: () => Promise<SubmissionAdminOverviewEntry[]>;
  AddCourse: (courseName: string) => Promise<ResponseObject>;
  UpdateCourseForUsers(
    courseUserAction: CourseUserAction,
    courseID: string,
  ): Promise<ResponseObject>;
  CreateAssignments(): Promise<AssignmentData[]>;
  GetAllAssignments(): Promise<AssignmentData[] | string[]>;
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
