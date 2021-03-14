import { EnvironmentDescription } from "./P4Environment";

const environments = new Map<string, EnvironmentDescription>();

environments.set("p4basic", {
  tasks: [
    [
      {
        name: "bash",
        cwd: "/home/p4/tutorials/exercises/basic/",
        executable: "make",
        params: [" stop && make && exit && exit"],
        provideTty: true,
      },
    ],
    [
      {
        name: "bash2",
        cwd: "/home/p4/tutorials/exercises/basic/",
        executable: "ls -al",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/tutorials/exercises/basic/basic.p4",
      alias: "basic.p4",
    },
  ],
  stopCommands: [
    {
      name: "bash",
      cwd: "/home/p4/tutorials/exercises/basic/",
      executable: "make",
      params: ["stop && exit"],
      provideTty: false,
    },
  ],
  description: "p4basic description",
  assignmentLabSheet: "../assignments/p4basic.md",
});

environments.set("l2_learning_switch", {
  tasks: [
    [
      {
        name: "bash",
        cwd: "/home/p4/tutorials/exercises/basic/",
        executable: "make",
        params: [""],
        provideTty: true,
      },
    ],
    [
      {
        name: "bash2",
        cwd: "/home/p4/tutorials/exercises/basic/",
        executable: "bash",
        params: [""],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/tutorials/exercises/basic/basic.p4",
      alias: "basic.p4",
    },
    {
      absFilePath: "/home/p4/tutorials/exercises/basic/Makefile",
      alias: "Makefile",
    },
  ],
  stopCommands: [
    {
      name: "bash",
      cwd: "/home/p4/tutorials/exercises/basic/",
      executable: "make",
      params: ["stop && exit"],
      provideTty: false,
    },
    {
      name: "bash2",
      cwd: "/home/p4/tutorials/exercises/basic/",
      executable: "exit",
      params: [""],
      provideTty: false,
    },
  ],
  description: "l2_learning_switch description",
  assignmentLabSheet: "../assignments/p4basic2.md",
});

environments.set("p4calc", {
  tasks: [
    [
      {
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
      name: "bash",
      cwd: "/home/ubuntu/tutorials/exercises/calc/",
      executable: "make",
      params: ["stop && exit"],
      provideTty: false,
    },
  ],
  description: "p4calc description",
  assignmentLabSheet: "../assignments/p4basic.md",
});

environments.set("python-test", {
  tasks: [
    [
      {
        name: "bash",
        cwd: "/home/p4/tmux/example3/",
        executable: "./start-tmux-example3-bash",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example3-LearningSwitch/learning_switch_controller_app.py",
      alias: "test1.py",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example3-LearningSwitch/learning_switch_controller_app.py",
      alias: "test2.py",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example3-LearningSwitch/p4src/prona-switch-learning.p4",
      alias: "test3.p4",
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
  ],
  description: "python-test description",
  assignmentLabSheet: "../assignments/prona-learningswitch.md",
});

environments.set("Example1-Repeater", {
  tasks: [
    [
      {
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example1-Repeater/tmux/",
        executable: "./start-tmux-example1-bash",
        params: [],
        provideTty: true,
      },
      {
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example1-Repeater/tmux/",
        executable: "./start-tmux-example1-bash2",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example1-Repeater/prona-repeater.p4",
      alias: "prona-repeater.p4",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example1-Repeater/Makefile",
      alias: "Makefile",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example1-Repeater/pod-topo/topology.json",
      alias: "topology.json",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example1-Repeater/pod-topo/s1-runtime.json",
      alias: "s1-runtime.json",
    },
  ],
  stopCommands: [
    {
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example1-Repeater/tmux/",
      executable: "./stop-tmux-example1-bash",
      params: [],
      provideTty: false,
    },
    {
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example1-Repeater/tmux/",
      executable: "./stop-tmux-example1-bash2",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example1-Repeater description",
  assignmentLabSheet: "../assignments/prona-repeater.md",
});

environments.set("Example2-MinimalisticSwitch", {
  tasks: [
    [
      {
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/tmux/",
        executable: "./start-tmux-example2-bash",
        params: [],
        provideTty: true,
      },
      {
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/tmux/",
        executable: "./start-tmux-example2-bash2",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/prona-switch-static-table.p4",
      alias: "prona-switch-static-table.p4",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/Makefile",
      alias: "Makefile",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/pod-topo/topology.json",
      alias: "topology.json",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/pod-topo/s1-runtime.json",
      alias: "s1-runtime.json",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/alternative/prona-switch-static-naive.p4",
      alias: "prona-switch-static-naive.p4",
    },
  ],
  stopCommands: [
    {
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/tmux/",
      executable: "./stop-tmux-example2-bash",
      params: [],
      provideTty: false,
    },
    {
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/tmux/",
      executable: "./stop-tmux-example2-bash2",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example2-MinimalisticSwitch description",
  assignmentLabSheet: "../assignments/prona-minimalisticswitch.md",
});

environments.set("Example3-LearningSwitch", {
  tasks: [
    [
      {
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/tmux/",
        executable: "./start-tmux-example3-bash",
        params: [],
        provideTty: true,
      },
      {
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/tmux/",
        executable: "./start-tmux-example3-bash2",
        params: [],
        provideTty: true,
      },
      {
        name: "bash3",
        cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/tmux/",
        executable: "./start-tmux-example3-bash3",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example3-LearningSwitch/p4src/prona-switch-learning.p4",
      alias: "prona-switch-learning.p4",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example3-LearningSwitch/learning_switch_controller_app.py",
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
      cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/tmux/",
      executable: "./stop-tmux-example3-bash",
      params: [],
      provideTty: false,
    },
    {
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/tmux/",
      executable: "./stop-tmux-example3-bash2",
      params: [],
      provideTty: false,
    },
    {
      name: "bash3",
      cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/tmux/",
      executable: "./stop-tmux-example3-bash3",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example3-LearningSwitch description",
  assignmentLabSheet: "../assignments/prona-learningswitch.md",
});

environments.set("Example-p4env", {
  tasks: [
    [
      {
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example-p4env/tmux/",
        executable: "./start-tmux-example4-bash",
        params: [],
        provideTty: true,
      },
      {
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example-p4env/tmux/",
        executable: "./start-tmux-example4-bash2",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/p4environment/p4programs/l2_forwarding_static/l2_forwarding_static.p4",
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
      cwd: "/home/p4/p4-boilerplate/Example-p4env/tmux/",
      executable: "./stop-tmux-example4-bash",
      params: [],
      provideTty: false,
    },
    {
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example-p4env/tmux/",
      executable: "./stop-tmux-example4-bash2",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example-p4env description",
  assignmentLabSheet: "../assignments/p4env.md",
});

export default environments;
