export interface UserAccount {
  name: string;
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
}
