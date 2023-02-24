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
}

export interface UserEnvironment {
  environment: string;
  description: string;
  instance: string;
}

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
}
