import type { EnvironmentDescription } from "../../Environment";

//change 'n clear assignment (german)
export const name = "Change-n-Clear";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "my bash",
        cwd: "/home/p4",
        executable: "bash",
        params: [""],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/onboarding/notes.md",
      alias: "notes.md",
    },
  ],
  stopCommands: [],
  steps: [
    {
      name: "1",
      label: "go to the temp direcotry using 'cd /tmp'",
      // useless test
      tests: [
        {
          type: "SSHCommand",
          command: "cd /tmp &&pwd",
          stdOutMatch: "^/tmp\\s*$",
          successMessage: "Instance reachable.",
          errorHint: "Check the SSH console to the instance.",
          gradualAssistance: [
            { failedCounter: 2, hint: "Check provider status and ports in the environment view." },
          ],
        },
      ],
    },
    {
      name: "2",
      label: "run 'clear' in any terminal",
      // tests for cd, since the user probably used it for the first task.
      // should that not be the case however, the test will still accomplish the goal since cd is run automatically by the shell when it opens
      tests: [
        {
          type: "TerminalBufferSearch",
          terminal: "(.*)",
          match: "^(?![\\s\\S]*cd)[\\s\\S]*$",
          successMessage: "terminal buffer is empty",
          errorHint: "Run `clear` in the terminal.",
        },
      ],
    },
  ],
  description: "Onboarding tour: first own assignment in learn-sdn-hub",
  assignmentLabSheet: "../assignments/change-n-clear-german.md",
  // keep the lab sheet served from the backend source tree (robust against
  // deployments built from backend/Dockerfile, where nothing outside backend/
  // is available at runtime)
  assignmentLabSheetLocation: "backend",
};
