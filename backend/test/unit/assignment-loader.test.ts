import { loadAssignmentEnvironments } from "../../src/Configuration";
import environments from "../../src/Configuration";
import path from "path";

const fixtures = path.join(__dirname, "fixtures", "loader");

describe("assignment loader", () => {
  it("registers every assignment file in a directory", () => {
    const loaded = loadAssignmentEnvironments(path.join(fixtures, "valid"));
    expect(loaded.get("Fixture-Valid")).toBeDefined();
    expect(loaded.size).toBe(1);
  });

  it("throws on a duplicate assignment name, naming the offending file", () => {
    expect(() => loadAssignmentEnvironments(path.join(fixtures, "duplicate")))
      .toThrow(/Fixture-Dup/);
  });

  it("throws on a file without a name export", () => {
    expect(() => loadAssignmentEnvironments(path.join(fixtures, "no-name")))
      .toThrow(/no-name/);
  });

  it("throws on a file without an environment export", () => {
    expect(() => loadAssignmentEnvironments(path.join(fixtures, "no-environment")))
      .toThrow(/no-environment/);
  });

  it("the module-level registry contains every production assignment", () => {
    expect(environments.size).toBe(26);
  });
});
