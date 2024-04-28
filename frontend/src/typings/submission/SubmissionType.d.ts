export type SubmissionAdminOverviewEntry = {
  submissionID: string;
  assignmentName: string;
  lastChanged: Date;
  username: string;
  groupNumber: number;
  fileNames: string[];
  terminalEndpoints: string[];
  assignmentRef?: string;
  userRef?: string;
};
