export type User = {
  _id: string;
  username: string;
  groupNumber: number;
  role?: string;
  courses?: string[];
};
