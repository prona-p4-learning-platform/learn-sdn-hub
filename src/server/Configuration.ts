import { EnvironmentDescription } from "./P4Environment";

const environments = new Map<string, EnvironmentDescription>();

environments.set("p4basic", {
  tasks: [
    {
      name: "bash",
      cwd: "/home/ubuntu/tutorials/exercises/basic/",
      executable: "make",
      params: ["&& exit && exit"],
      provideTty: true,
    },
  ],
  editableFiles: [
    {
      absFilePath: "/home/ubuntu/tutorials/exercises/basic/basic.p4",
      alias: "basic.p4",
    },
  ],
  stopCommands: [
    {
      name: "bash",
      cwd: "/home/ubuntu/tutorials/exercises/basic/",
      executable: "make",
      params: ["stop && exit"],
      provideTty: false,
    },
  ],
  description: "MininetUebung1",
});

environments.set("p4calc", {
  tasks: [
    {
      name: "bash",
      cwd: "/home/ubuntu/tutorials/exercises/calc/",
      executable: "make",
      params: ["&& exit && exit"],
      provideTty: true,
    },
  ],
  editableFiles: [],
  stopCommands: [
    {
      name: "bash",
      cwd: "/home/ubuntu/tutorials/exercises/calc/",
      executable: "make",
      params: ["stop && exit"],
      provideTty: false,
    },
  ],
  description: "MininetUebung1",
});

export default environments;
