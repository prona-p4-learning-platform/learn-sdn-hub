// TODO: place type in separate file and import it from there, where needed?
type TerminalStateType = {
  endpoint: string;
  state: string;
};

export interface UserAccount {
  username: string;
  _id: string;
  password: string;
}

export interface UserEnvironment {
  identifier: string;
  description: string;
}

export interface Persister {
  GetUserAccount: (username: string) => Promise<UserAccount>;
  GetUserEnvironments: (username: string) => Promise<UserEnvironment[]>;
  AddUserEnvironment: (
    username: string,
    identifier: string,
    description: string
  ) => Promise<void>;
  RemoveUserEnvironment: (
    username: string,
    identifier: string
  ) => Promise<void>;
  SubmitUserEnvironment: (
    username: string,
    identifier: string,
    terminalStates: TerminalStateType[],
    submittedFiles: Map<string, string>
  ) => Promise<void>;
}
