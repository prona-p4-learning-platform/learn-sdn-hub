import type { EnvironmentDescription } from "../../Environment";

export const name = "Linux-Network-Basics";
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
      absFilePath: "/home/p4/.bashrc",
      alias: "bashrc",
    },
  ],
  stopCommands: [],
  steps: [
    {
      name: "1",
      label: "show your interfaces with ip addr",
      tests: [
        {
          type: "TerminalBufferSearch",
          terminal: "(.*)",
          match: "inet [0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+",
          successMessage: "IPv4 addresses found in the ip addr output.",
          errorHint: "Run `ip addr` in the terminal.",
          gradualAssistance: [
            {
              failedCounter: 2,
              hint: "Type exactly `ip addr` and press Enter, the output must show lines starting with `inet`.",
            },
          ],
        },
      ],
    },
    {
      name: "2",
      label: "ping localhost three times",
      tests: [
        {
          type: "TerminalBufferSearch",
          terminal: "(.*)",
          match: "3 packets transmitted, 3 received",
          successMessage: "Three successful pings found.",
          errorHint: "Run `ping -c 3 127.0.0.1` in the terminal.",
          gradualAssistance: [
            {
              failedCounter: 2,
              hint: "Use `-c 3` so ping stops after three packets and prints its summary.",
            },
          ],
        },
      ],
    },
    {
      name: "3",
      label: "add the alias myip to .bashrc",
      tests: [
        {
          type: "SSHCommand",
          command: 'grep -c "alias myip=" /home/p4/.bashrc',
          stdOutMatch: "[1-9]",
          successMessage: "Alias myip found in .bashrc.",
          errorHint:
          "Add `alias myip='ip -4 addr show'` to bashrc in the editor and save the file.",
          gradualAssistance: [
            {
              failedCounter: 2,
              hint: "Make sure you saved the file in the editor; the line must start with `alias myip=`.",
            },
          ],
        },
      ],
    },
  ],
  description: "Linux network basics: interfaces, ping and a shell alias",
  assignmentLabSheet: "../assignments/linux-network-basics.md",
  // keep the lab sheet served from the backend source tree (same as
  // Onboarding-Tour)
  assignmentLabSheetLocation: "backend",
};
