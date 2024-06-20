import { EnvironmentDescription } from "./Environment";

const environments = new Map<string, EnvironmentDescription>();

environments.set("p4basic-with-guacamole", {
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/tutorials/exercises/basic/",
        executable: "make",
        params: [" stop && make && exit && exit"],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/tutorials/exercises/basic/",
        executable: "ls -al",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Desktop",
        name: "desk1",
        guacamoleServerURL: "http://127.0.0.1:8080/guacamole",
        remoteDesktopProtocol: "vnc",
        remoteDesktopPort: 5900,
        remoteDesktopPassword: "vncpassword",
      },
    ],
    [
      {
        type: "WebApp",
        name: "test",
        url: "https://www.example.org",
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
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/tutorials/exercises/basic/",
      executable: "make",
      params: ["stop && exit"],
      provideTty: false,
    },
  ],
  steps: [
    {
      name: "1",
      label: "make h1 ping h2 work",
      tests: [
        {
          type: "SSHCommand",
          command: "mx h1 ls",
          stdOutMatch: "(.*)",
          successMessage: "h1 ls worked!",
          errorHint: "could not run ls on h1",
        },
        {
          type: "SSHCommand",
          command: "echo mx h1 ping -c 10.0.2.2",
          stdOutMatch: "(.*)",
          successMessage: "ping from h1 to h2 worked!",
          errorHint:
            "ping from h1 to h2 did not work. Check arp and ip rules between h1 and h2",
        },
      ],
    },
    {
      name: "2",
      label: "enter 'foo' in any terminal and 'bar' in terminal bash2",
      tests: [
        {
          type: "TerminalBufferSearch",
          terminal: "(.*)",
          match: "(.*)foo(.*)",
          successMessage: "foo found",
          errorHint: "foo not found",
        },
        {
          type: "TerminalBufferSearch",
          terminal: "bash2",
          match: "(.*)bar(.*)",
          successMessage: "bar found",
          errorHint: "bar not found",
        },
      ],
    },
  ],
  submissionPrepareCommand:
    "tar zcvf /tmp/$user-$environment.tar.gz /home/p4/tutorials/exercises/basic/ && touch /tmp/test",
  submissionSupplementalFiles: ["/tmp/$user-$environment.tar.gz", "/tmp/test"],
  submissionCleanupCommand: "rm /tmp/$user-$environment.tar.gz && rm /tmp/test",
  description: "p4basic description",
  assignmentLabSheet: "../assignments/p4basic.md",
});

environments.set("l2_learning_switch", {
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/tutorials/exercises/basic/",
        executable: "make",
        params: [""],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
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
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/tutorials/exercises/basic/",
      executable: "make",
      params: ["stop && exit"],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/tutorials/exercises/basic/",
      executable: "exit",
      params: [""],
      provideTty: false,
    },
  ],
  description: "l2_learning_switch description",
  assignmentLabSheet: "../assignments/p4basic2.md",
  providerDockerCmd: "sshd",
  providerImage: "ubuntu:focal",
});

environments.set("p4calc", {
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
});

environments.set("python-test", {
  terminals: [
    [
      {
        type: "Shell",
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
      absFilePath: "/home/p4/p4-boilerplate/Example0-SDN-Intro/OpenFlowApp.py",
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
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/",
      executable: "exit",
      params: [],
      provideTty: false,
    },
  ],
  description: "python-test description",
  assignmentLabSheet: "../assignments/prona-learningswitch.md",
  rootPath: "/home/p4/",
  workspaceFolders: [
    "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
    "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
  ],
  useCollaboration: true,
  useLanguageClient: false,
});

environments.set("Example0-SDN-Intro", {
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
        executable: "./start-terminal2.sh",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/p4-boilerplate/Example0-SDN-Intro/OpenFlowTopo.py",
      alias: "OpenFlowTopo.py",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example0-SDN-Intro/OpenFlowApp.py",
      alias: "OpenFlowApp.py",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
      executable: "./stop-terminal1.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
      executable: "./stop-terminal2.sh",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example0-SDN-Intro description",
  assignmentLabSheet: "../assignments/prona-sdn-intro.md",
});

environments.set("Beispiel0-SDN-Einfuehrung", {
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
        executable: "./start-terminal2.sh",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/p4-boilerplate/Example0-SDN-Intro/OpenFlowTopo.py",
      alias: "OpenFlowTopo.py",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example0-SDN-Intro/OpenFlowApp.py",
      alias: "OpenFlowApp.py",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
      executable: "./stop-terminal1.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
      executable: "./stop-terminal2.sh",
      params: [],
      provideTty: false,
    },
  ],
  description: "Beispiel0-SDN-Einfuehrung beschreibung",
  assignmentLabSheet: "../assignments/prona-sdn-intro-german.md",
  rootPath: "/home/p4/",
  workspaceFolders: ["/home/p4/p4-boilerplate/Example0-SDN-Intro/"],
  useCollaboration: true,
  useLanguageClient: true,
});

environments.set("Example1-Repeater", {
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example1-Repeater/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example1-Repeater/",
        executable: "./start-terminal2.sh",
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
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example1-Repeater/",
      executable: "./stop-terminal1.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example1-Repeater/",
      executable: "./stop-terminal2.sh",
      params: [],
      provideTty: false,
    },
  ],
  steps: [
    {
      name: "1",
      label: "make h1 ping h3 work",
      tests: [
        {
          type: "SSHCommand",
          command: "mx h1 ping -c 3 10.0.10.3",
          stdOutMatch: "(.*)",
          successMessage: "ping from h1 to h3 worked!",
          errorHint: "ping from h1 to h3 did not work. Check your P4 code.",
        },
      ],
    },
  ],
  submissionPrepareCommand:
    "tar zcvf /tmp/$user-$environment.tar.gz /home/p4/p4-boilerplate/Example1-Repeater/",
  submissionSupplementalFiles: ["/tmp/$user-$environment.tar.gz"],
  submissionCleanupCommand: "rm /tmp/$user-$environment.tar.gz",
  description: "Example1-Repeater description",
  assignmentLabSheet: "../assignments/prona-repeater.md",
  assignmentLabSheetLocation: "backend",
  providerDockerSupplementalPorts: ["80/tcp", "8080/tcp"],
});

environments.set("Example2-MinimalisticSwitch", {
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/",
        executable: "./start-terminal2.sh",
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
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/",
      executable: "./stop-terminal1.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/",
      executable: "./stop-terminal2.sh",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example2-MinimalisticSwitch description",
  assignmentLabSheet: "../assignments/prona-minimalisticswitch.md",
});

environments.set("Example3-LearningSwitch", {
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
        executable: "./start-terminal2.sh",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "bash3",
        cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
        executable: "./start-terminal3.sh",
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
    {
      absFilePath: "/home/p4/tutorials/exercises/basic/basic.p4",
      alias: "basic.p4",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
      executable: "./stop-terminal1.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
      executable: "./stop-terminal2.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash3",
      cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
      executable: "./stop-terminal3.sh",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example3-LearningSwitch description",
  assignmentLabSheet: "../assignments/prona-learningswitch.md",
  providerDockerSupplementalPorts: ["80/tcp", "8080/tcp"],
});

environments.set("Example-p4env", {
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example-p4env/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example-p4env/",
        executable: "./start-terminal2.sh",
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
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example-p4env/",
      executable: "./stop-terminal1.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example-p4env/",
      executable: "./stop-terminal2.sh",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example-p4env description",
  assignmentLabSheet: "../assignments/p4env.md",
});

//sudo clab inspect &>/dev/null; if [ $? -eq 1 ]; then sudo clab deploy &>/dev/null; fi; docker exec -it clab-kommprot-lab-transport-host1 bash;
environments.set("KommProt-Ue1-Test", {
  terminals: [
    [
      {
        type: "Shell",
        name: "host1",
        cwd: "/home/p4/kommprot-labs/kommprot-lab-application-layer",
        executable:
          "while [ true ]; do clear && sudo clab inspect &>/dev/null; if [ $? -eq 1 ]; then sudo clab deploy &>/dev/null; fi; docker exec -it clab-kommprot-lab-transport-host1 bash; done",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "host2",
        cwd: "/home/p4/kommprot-labs/kommprot-lab-application-layer",
        executable:
          "while [ true ]; do clear && sudo clab inspect &>/dev/null; if [ $? -eq 1 ]; then sudo clab deploy &>/dev/null; fi; docker exec -it clab-kommprot-lab-transport-host2 bash; done",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/kommprot-labs/kommprot-lab-application-layer/README.md",
      alias: "README",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "host1",
      cwd: "/home/p4/kommprot-labs/kommprot-lab-application-layer",
      executable: "sudo clab destroy",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "host2",
      cwd: "/home/p4/kommprot-labs/kommprot-lab-application-layer",
      executable: "",
      params: [],
      provideTty: false,
    },
  ],
  description: "KommProt-Ue1 description",
  assignmentLabSheetLocation: "instance",
  assignmentLabSheet:
    "/home/p4/kommprot-labs/kommprot-lab-application-layer/README.md",
});

export default environments;

export function updateEnvironments(
  updatedEnvironments: Map<string, EnvironmentDescription>,
): void {
  environments.clear();

  updatedEnvironments.forEach((value, key) => {
    environments.set(key, value);
  });
}
