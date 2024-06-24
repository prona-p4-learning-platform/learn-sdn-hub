export type SubmissionAdminOverviewEntry = {
  submissionID: string;
  assignmentName: string;
  lastChanged: Date;
  username: string;
  groupNumber: number;
  fileNames: string[];
  terminalEndpoints: string[];
  points?: number;
  assignmentRef?: string;
  userRef?: string;
};
