import type { EnvironmentDescription } from "../../Environment";

// Minimal onboarding assignment (German lab sheet, see
// onboarding-german/assignments/onboarding-tour-german.md). Docker provider
// variant: one Shell terminal, one editable file, two check steps. Deploy with
// BACKEND_TYPE=docker and DOCKER_IMAGE=prona/p4-container (see onboarding
// runbook). Containerlab variant: replace the Shell terminal with a DockerShell
// terminal and add a topologyUrl.
export const name = "Onboarding-Tour";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
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
      label: "check the instance with uname -a",
      tests: [
        {
          type: "SSHCommand",
          command: "uname -a",
          stdOutMatch: "(.*)Linux(.*)",
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
      label: "run 'whoami' in any terminal",
      tests: [
        {
          type: "TerminalBufferSearch",
          terminal: "(.*)",
          match: "(.*)whoami(.*)",
          successMessage: "whoami found in the terminal buffer.",
          errorHint: "Run `whoami` in the terminal.",
        },
      ],
    },
  ],
  description: "Onboarding tour: first own assignment in learn-sdn-hub",
  assignmentLabSheet: "../assignments/onboarding-tour-german.md",
  // keep the lab sheet served from the backend source tree (robust against
  // deployments built from backend/Dockerfile, where nothing outside backend/
  // is available at runtime)
  assignmentLabSheetLocation: "backend",
};
