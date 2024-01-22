import {
  Submission,
  SubmissionFileType,
  TerminalStateType,
} from "../Environment";

export interface UserAccount {
  _id: string;
  username: string;
  groupNumber: number;
  password?: string;
  passwordHash?: string;
  assignmentListFilter?: string;
  role?: string;
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
}

type CourseUserAction = {
  [key in "add" | "remove"]: {
    userID: string;
  }[];
};

export interface Persister {
  GetUserAccount: (username: string) => Promise<UserAccount>;
  GetUserEnvironments: (username: string) => Promise<UserEnvironment[]>;
  AddUserEnvironment: (
    username: string,
    environment: string,
    description: string,
    instance: string
  ) => Promise<void>;
  RemoveUserEnvironment: (
    username: string,
    environment: string
  ) => Promise<void>;
  SubmitUserEnvironment: (
    username: string,
    groupNumber: number,
    environment: string,
    terminalStates: TerminalStateType[],
    submittedFiles: SubmissionFileType[]
  ) => Promise<void>;
  GetUserSubmissions: (
    username: string,
    groupNumber: number
  ) => Promise<Submission[]>;
  GetAllUsers: () => Promise<UserData[]>;
  GetAllCourses: () => Promise<CourseData[]>;
  UpdateCourseForUsers(
    courseUserAction: CourseUserAction,
    courseID: string
  ): Promise<ResponseObject>;
}
