import type { EnvironmentDescription } from "../../Environment";

// assignment idea: students inspect their instance from the
// terminal and write the answers to answers.txt using the editor. Each check
// compares a line of answers.txt with the real value on the instance
export const name = "System-Detective";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4",
        // create answers.txt so the editor can open it right away
        executable: "touch answers.txt",
        params: [""],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/answers.txt",
      alias: "answers.txt",
    },
  ],
  stopCommands: [],
  steps: [
    {
      name: "1",
      label: "find the hostname of your instance",
      tests: [
        {
          type: "SSHCommand",
          command: 'grep -q "$(hostname)" /home/p4/answers.txt && echo ok',
          stdOutMatch: "ok",
          successMessage: "Hostname found.",
          errorHint: "answers.txt does not contain the hostname of your instance.",
          gradualAssistance: [
            { failedCounter: 2, hint: "Run `hostname` in the terminal and put the result on its own line." },
          ],
        },
      ],
    },
    {
      name: "2",
      label: "find the IP address of your instance",
      tests: [
        {
          type: "SSHCommand",
          command: 'grep -q "$(hostname -i)" /home/p4/answers.txt && echo ok',
          stdOutMatch: "ok",
          successMessage: "IP address found.",
          errorHint: "answers.txt does not contain an IP address of your instance.",
          gradualAssistance: [
            { failedCounter: 2, hint: "Run `hostname -I` and put one of the addresses on its own line." },
          ],
        },
      ],
    },
    {
      name: "3",
      label: "find the kernel version of your instance",
      tests: [
        {
          type: "SSHCommand",
          command: 'grep -q "$(uname -r)" /home/p4/answers.txt && echo ok',
          stdOutMatch: "ok",
          successMessage: "Kernel version found.",
          errorHint: "answers.txt does not contain the kernel release of your instance.",
          gradualAssistance: [
            { failedCounter: 2, hint: "Run `uname -r` and put the result on its own line." },
          ],
        },
      ],
    },
  ],
  description: "System detective: find out facts about your instance",
  assignmentLabSheet: "../assignments/system-detective.md",
  assignmentLabSheetLocation: "backend",
};
