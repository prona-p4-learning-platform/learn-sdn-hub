import DockerProvider from "../../src/providers/DockerProvider";

// Dockerode is mocked wholesale; it records the options object the
// DockerProvider hands to the constructor so we can assert that unset
// DOCKER_* env vars do not clobber docker-modem's platform defaults
// (unix socket on Linux, npipe on Windows) with explicit undefined keys.
const dockerodeOptions: unknown[] = [];
jest.mock("dockerode", () => {
  class MockDockerode {
    constructor(options: unknown) {
      dockerodeOptions.push(options);
    }
  }
  return MockDockerode;
});

const ENV_KEYS = [
  "DOCKER_IMAGE",
  "DOCKER_CMD",
  "DOCKER_MAX_INSTANCE_LIFETIME_MINUTES",
  "DOCKER_PROTOCOL",
  "DOCKER_PORT",
  "DOCKER_HOST",
  "DOCKER_SOCKET_PATH",
] as const;

describe("DockerProvider", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    // required by the constructor regardless of the scenario under test
    process.env.DOCKER_IMAGE = "prona/p4-container";
    process.env.DOCKER_CMD = "-s";
    process.env.DOCKER_MAX_INSTANCE_LIFETIME_MINUTES = "120";
    dockerodeOptions.length = 0;
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  test("with no socket env vars set, no explicit keys override docker-modem defaults", () => {
    new DockerProvider();

    expect(dockerodeOptions).toHaveLength(1);
    const options = dockerodeOptions[0] as Record<string, unknown>;
    expect("socketPath" in options).toBe(false);
    expect("host" in options).toBe(false);
    expect("port" in options).toBe(false);
    expect("protocol" in options).toBe(false);
    expect(options.timeout).toBe(20000);
  });

  test("DOCKER_SOCKET_PATH is passed through as an explicit override", () => {
    process.env.DOCKER_SOCKET_PATH = "/var/run/docker.sock";

    new DockerProvider();

    const options = dockerodeOptions[0] as Record<string, unknown>;
    expect(options.socketPath).toBe("/var/run/docker.sock");
    expect("host" in options).toBe(false);
  });

  test("DOCKER_HOST is passed through and no socketPath key is set", () => {
    process.env.DOCKER_HOST = "tcp://127.0.0.1:2375";

    new DockerProvider();

    const options = dockerodeOptions[0] as Record<string, unknown>;
    expect(options.host).toBe("tcp://127.0.0.1:2375");
    expect("socketPath" in options).toBe(false);
  });

  test("DOCKER_PORT and DOCKER_PROTOCOL are only included when set", () => {
    process.env.DOCKER_PORT = "2375";
    process.env.DOCKER_PROTOCOL = "http";

    new DockerProvider();

    const options = dockerodeOptions[0] as Record<string, unknown>;
    expect(options.port).toBe(2375);
    expect(options.protocol).toBe("http");
  });
});
