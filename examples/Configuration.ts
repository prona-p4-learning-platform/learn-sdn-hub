import { EnvironmentDescription } from "./P4Environment";

const environments = new Map<string, EnvironmentDescription>();

environments.set("Example1-Repeater", {
  tasks: [
    {
      name: "bash",
      cwd: "/home/p4/tmux/example1/",
      executable: "./start-tmux-example1-bash",
      params: [],
      provideTty: true,
    },
    {
      name: "bash2",
      cwd: "/home/p4/tmux/example1/",
      executable: "./start-tmux-example1-bash2",
      params: [],
      provideTty: true,
    },
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/p4-boilerplate/Example1-Repeater/prona-repeater.p4",
      alias: "prona-repeater.p4",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example1-Repeater/Makefile",
      alias: "Makefile",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example1-Repeater/pod-topo/topology.json",
      alias: "topology.json",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example1-Repeater/pod-topo/s1-runtime.json",
      alias: "s1-runtime.json",
    },
  ],
  stopCommands: [
    {
      name: "bash",
      cwd: "/home/p4/",
      executable: "exit",
      params: [],
      provideTty: false,
    },
    {
      name: "bash2",
      cwd: "/home/p4/",
      executable: "exit",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example1-Repeater",
  assignmentLabSheet: "../assignments/prona-repeater.md",
});

environments.set("Example2-MinimalisticSwitch", {
  tasks: [
  {
    name: "bash",
    cwd: "/home/p4/tmux/example2/",
    executable: "./start-tmux-example2-bash",
    params: [],
    provideTty: true,
  },
  {
    name: "bash2",
    cwd: "/home/p4/tmux/example2/",
    executable: "./start-tmux-example2-bash2",
    params: [],
    provideTty: true,
  },
],
editableFiles: [
  {
    absFilePath: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/prona-switch-static-table.p4",
    alias: "prona-switch-static-table.p4",
  },
  {
    absFilePath: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/Makefile",
    alias: "Makefile",
  },
  {
    absFilePath: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/pod-topo/topology.json",
    alias: "topology.json",
  },
  {
    absFilePath: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/pod-topo/s1-runtime.json",
    alias: "s1-runtime.json",
  },
  {
    absFilePath: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/alternative/prona-switch-static-naive.p4",
    alias: "prona-switch-static-naive.p4",
  },
],
stopCommands: [
  {
    name: "bash",
    cwd: "/home/p4/",
    executable: "exit",
    params: [],
    provideTty: false,
  },
  {
    name: "bash2",
    cwd: "/home/p4/",
    executable: "exit",
    params: [],
    provideTty: false,
  },
],
description: "Example2-MinimalisticSwitch",
assignmentLabSheet: "../assignments/prona-minimalisticswitch.md",
});

environments.set("Example3-LearningSwitch", {
tasks: [
  {
    name: "bash",
    cwd: "/home/p4/tmux/example3/",
    executable: "./start-tmux-example3-bash",
    params: [],
    provideTty: true,
  },
  {
    name: "bash2",
    cwd: "/home/p4/tmux/example3/",
    executable: "./start-tmux-example3-bash2",
    params: [],
    provideTty: true,
  },
  {
    name: "bash3",
    cwd: "/home/p4/tmux/example3/",
    executable: "./start-tmux-example3-bash3",
    params: [],
    provideTty: true,
  },
],
editableFiles: [
  {
    absFilePath: "/home/p4/p4-boilerplate/Example3-LearningSwitch/p4src/prona-switch-learning.p4",
    alias: "prona-switch-learning.p4",
  },
  {
    absFilePath: "/home/p4/p4-boilerplate/Example3-LearningSwitch/learning_switch_controller_app.py",
    alias: "learning_switch_controller_app.py",
  },
  {
    absFilePath: "/home/p4/p4-boilerplate/Example3-LearningSwitch/p4app.json",
    alias: "p4app.json",
  },
],
stopCommands: [
  {
    name: "bash",
    cwd: "/home/p4/",
    executable: "exit",
    params: [],
    provideTty: false,
  },
  {
    name: "bash2",
    cwd: "/home/p4/",
    executable: "exit",
    params: [],
    provideTty: false,
  },
  {
    name: "bash3",
    cwd: "/home/p4/",
    executable: "exit",
    params: [],
    provideTty: false,
  },
],
description: "Example3-LearningSwitch",
assignmentLabSheet: "../assignments/prona-learningswitch.md",
});
environments.set("Example-p4env", {
tasks: [
  {
    name: "bash",
    cwd: "/home/p4/tmux/example4/",
    executable: "./start-tmux-example4-bash",
    params: [],
    provideTty: true,
  },
  {
    name: "bash2",
    cwd: "/home/p4/tmux/example4/",
    executable: "./start-tmux-example4-bash2",
    params: [],
    provideTty: true,
  },
],
editableFiles: [
  {
    absFilePath: "/home/p4/p4environment/p4programs/l2_forwarding_static/l2_forwarding_static.p4",
    alias: "l2_forwarding_static.p4",
  },
  {
    absFilePath: "/home/p4/p4environment/p4topos/diamond_shape/topology.json",
    alias: "topology.json",
  },
],
stopCommands: [
  {
    name: "bash",
    cwd: "/home/p4/",
    executable: "exit",
    params: [],
    provideTty: false,
  },
  {
    name: "bash2",
    cwd: "/home/p4/",
    executable: "exit",
    params: [],
    provideTty: false,
  },
],
description: "Example-p4env",
assignmentLabSheet: "../assignments/p4env.md",
});

export default environments;
