import type { EnvironmentDescription } from "../../Environment";

export const name = "p4calc";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/ubuntu/tutorials/exercises/calc/",
        executable: "make",
        params: ["&& exit && exit"],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/ubuntu/tutorials/exercises/calc/",
      executable: "make",
      params: ["stop && exit"],
      provideTty: false,
    },
  ],
  description: "p4calc description",
  assignmentLabSheet: "../assignments/p4basic.md",
};
