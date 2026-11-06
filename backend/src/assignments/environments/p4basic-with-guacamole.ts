import type { EnvironmentDescription } from "../../Environment";

export const name = "p4basic-with-guacamole";
export const environment: EnvironmentDescription = {
  type: "normal",
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
};
