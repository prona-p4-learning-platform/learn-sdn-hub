export type User = {
  _id: string;
  username: string;
  groupNumber: number;
  role?: string;
  courses?: string[];
  environments?: {
    environment: string;
    description?: string | null;
    instance: string;
    port?: number;
  }[];
};
