import type { EnvironmentDescription } from "../../Environment";

export const name = "Example-Exam";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/",
        executable: "bash",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [],
  stopCommands: [],
  steps: [
    {
      name: "1",
      label: "MatrNr Eingabe",
      // bonusPoints: bonus for previous labs; points: exam score (grade points)
      bonusPoints: 5,
      points: 10,
      tests: [
        {
          type: "Dialog",
          message: "MatrNr",
          successMessage: "MatrNr entered",
          errorHint: "MatrNr not entered",
        },
      ],
    },
    {
      name: "2",
      label: "Name Eingabe",
      bonusPoints: 5,
      points: 10,
      tests: [
        {
          type: "Dialog",
          message: "Name",
          successMessage: "Name entered",
          errorHint: "Name not entered",
        },
      ],
    },
  ],
  description: "Example Exam",
  assignmentLabSheet: "none",
  providerProxmoxTemplateTag: "learn-sdn-hub-template-acn-p4",
  useCollaboration: true,
  useLanguageClient: false,
  isExam: true,
  durationMinutes: 3,
};
