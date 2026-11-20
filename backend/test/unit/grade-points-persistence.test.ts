import { updateEnvironment } from "../../src/Configuration";
import type { EnvironmentDescription } from "../../src/Environment";
import MemoryPersister from "../../src/database/MemoryPersister";
import type {
  SubmissionFileType,
  TerminalStateType,
} from "../../src/Environment";
import fs from "fs";
import path from "path";

const resultsRoot = path.resolve("src", "assignments", "results");
const createdDirs: string[] = [];

afterAll(() => {
  for (const dir of createdDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("updateEnvironment maxGradePoints computation", () => {
  it("computes maxGradePoints from the sum of step points", () => {
    const env = {
      steps: [
        { bonusPoints: 5, points: 10 },
        { bonusPoints: 5, points: 10 },
      ],
    } as unknown as EnvironmentDescription;
    updateEnvironment(env);
    expect(env.maxGradePoints).toBe(20);
    expect(env.maxBonusPoints).toBe(10);
  });

  it("clamps maxGradePoints up when set below the step sum", () => {
    const env = {
      maxGradePoints: 15,
      steps: [
        { points: 10 },
        { points: 10 },
      ],
    } as unknown as EnvironmentDescription;
    updateEnvironment(env);
    expect(env.maxGradePoints).toBe(20);
  });

  it("leaves maxGradePoints undefined when no step defines points", () => {
    const env = {
      steps: [{ bonusPoints: 5 }],
    } as unknown as EnvironmentDescription;
    updateEnvironment(env);
    expect(env.maxGradePoints).toBeUndefined();
    expect(env.maxBonusPoints).toBe(5);
  });

  it("keeps maxGradePoints undefined for environments without steps", () => {
    const env = {} as EnvironmentDescription;
    updateEnvironment(env);
    expect(env.maxGradePoints).toBeUndefined();
    expect(env.maxBonusPoints).toBeUndefined();
  });

  it("works for database AssignmentData entries too", () => {
    const env = {
      _id: "abc",
      name: "Example-Exam",
      steps: [{ points: 7 }],
    } as unknown as EnvironmentDescription;
    updateEnvironment(env);
    expect(env.maxGradePoints).toBe(7);
  });
});

describe("MemoryPersister gradePoints persistence", () => {
  const terminalStates: TerminalStateType[] = [
    { endpoint: "http://localhost:8080/test", state: "ready" },
  ];
  const submittedFiles: SubmissionFileType[] = [];

  it("writes gradePoints.txt next to bonusPoints.txt when gradePoints is set", async () => {
    const persister = new MemoryPersister();
    const dirName = "gradepoints-user-1-gradePointsEnv";
    const resultPath = path.resolve(resultsRoot, dirName);
    createdDirs.push(resultPath);

    await persister.SubmitUserEnvironment(
      "gradepoints-user",
      1,
      "gradePointsEnv",
      "unique-id",
      terminalStates,
      submittedFiles,
      3,
      undefined,
      12,
    );

    expect(fs.existsSync(path.resolve(resultPath, "bonusPoints.txt"))).toBe(true);
    expect(fs.readFileSync(path.resolve(resultPath, "bonusPoints.txt"), "utf8")).toBe("3");
    expect(fs.existsSync(path.resolve(resultPath, "gradePoints.txt"))).toBe(true);
    expect(fs.readFileSync(path.resolve(resultPath, "gradePoints.txt"), "utf8")).toBe("12");
  });

  it("does not write gradePoints.txt when gradePoints is undefined", async () => {
    const persister = new MemoryPersister();
    const dirName = "gradepoints-user-2-noGradePointsEnv";
    const resultPath = path.resolve(resultsRoot, dirName);
    createdDirs.push(resultPath);

    await persister.SubmitUserEnvironment(
      "gradepoints-user",
      2,
      "noGradePointsEnv",
      "unique-id",
      terminalStates,
      submittedFiles,
      3,
    );

    expect(fs.existsSync(path.resolve(resultPath, "bonusPoints.txt"))).toBe(true);
    expect(fs.existsSync(path.resolve(resultPath, "gradePoints.txt"))).toBe(false);
  });
});
