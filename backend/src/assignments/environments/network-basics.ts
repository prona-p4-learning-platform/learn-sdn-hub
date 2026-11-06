import type { EnvironmentDescription } from "../../Environment";

// Network-Basics: very small own assignment for onboarding.
export const name = "Network-Basics";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4",
        executable: "touch /home/p4/answers.md && bash",
        params: [""],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/answers.md",
      alias: "answers.md",
    },
  ],
  stopCommands: [],
  steps: [
    {
      name: "1",
      label: "inspect the loopback interface",
      tests: [
        {
          type: "TerminalBufferSearch",
          terminal: "(.*)",
          match: "(.*)ip (.*)a(ddr)?(.*)",
          successMessage: "Interface listing found in the terminal buffer.",
          errorHint: "Run `ip -brief addr` in the terminal and look for `lo`.",
        },
      ],
    },
    {
      name: "2",
      label: "ping the loopback address",
      tests: [
        {
          type: "TerminalBufferSearch",
          terminal: "(.*)",
          match: "(.*)ping -c(.*)",
          successMessage: "ping found in the terminal buffer.",
          errorHint: "Run `ping -c 3 127.0.0.1` in the terminal.",
        },
      ],
    },
    {
      name: "3",
      label: "write your observation into answers.md",
      tests: [
        {
          type: "SSHCommand",
          command: "grep -ci loopback /home/p4/answers.md",
          stdOutMatch: "[1-9](.*)",
          successMessage: "answers.md mentions the loopback interface.",
          errorHint:
            "Explain in answers.md what the loopback interface is for and click Deploy in the editor.",
          gradualAssistance: [
            {
              failedCounter: 3,
              hint: "Use the word 'loopback' in your answer and save the file.",
            },
          ],
        },
      ],
    },
  ],
  description: "Network-Basics: inspect interfaces and check reachability",
  assignmentLabSheet: "../assignments/network-basics.md",
  assignmentLabSheetLocation: "backend",
};
