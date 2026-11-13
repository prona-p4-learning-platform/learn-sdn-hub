import DockerProvider from "../../src/providers/DockerProvider";
import Dockerode from "dockerode";
// import { jest, describe, it, expect, beforeEach, afterAll } from "@jest/globals";

jest.mock("dockerode");
jest.mock("toad-scheduler", () => ({
  ToadScheduler: jest.fn().mockImplementation(() => ({
    addSimpleIntervalJob: jest.fn(),
  })),
  SimpleIntervalJob: jest.fn(),
  AsyncTask: jest.fn(),
}));

describe("DockerProvider.createServer", () => {
  const originalEnv = process.env;
  let mockCreateContainer: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      DOCKER_IMAGE: "prona/p4-container:latest",
      DOCKER_CMD: "sshd",
      DOCKER_MAX_INSTANCE_LIFETIME_MINUTES: "60",
    };

    mockCreateContainer = jest.fn();
    (Dockerode as unknown as jest.Mock).mockImplementation(() => ({
      createContainer: mockCreateContainer,
      listContainers: jest.fn().mockResolvedValue([]),
    }));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws a helpful pull hint when Docker returns 404 No such image", async () => {
    const provider = new DockerProvider();
    const notFoundError = Object.assign(
      new Error("(HTTP code 404) no such container - No such image: prona/p4-container:latest"),
      { statusCode: 404 },
    );
    mockCreateContainer.mockRejectedValueOnce(notFoundError);

    await expect(
      provider.createServer("alice", 1, "p4basic", {}),
    ).rejects.toThrow(
      'DockerProvider: Could not create container because image "prona/p4-container:latest" is not available locally. Pull it first using "docker pull prona/p4-container:latest".',
    );
  });

  it("preserves the generic error message for other container creation failures", async () => {
    const provider = new DockerProvider();
    mockCreateContainer.mockRejectedValueOnce(new Error("permission denied"));

    await expect(
      provider.createServer("alice", 1, "p4basic", {}),
    ).rejects.toThrow(
      "DockerProvider: Could not create container.\npermission denied",
    );
  });
});
