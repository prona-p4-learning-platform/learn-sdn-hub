import { AssignmentData } from "./database/Persister";
import { EnvironmentDescription } from "./Environment";

import fs from "fs";
import path from "path";

// Assignments are defined one-per-file in src/assignments/environments/ — a
// student demo-assignment PR adds a new file there instead of editing this
// registry, which removes the recurring merge conflicts between parallel
// assignment PRs. MongoDB-stored assignments override these defaults at
// runtime via updateEnvironments().

const environments = loadAssignmentEnvironments(
  path.join(__dirname, "assignments", "environments"),
);

export function loadAssignmentEnvironments(
  environmentsDir: string,
): Map<string, EnvironmentDescription> {
  const loaded = new Map<string, EnvironmentDescription>();
  const files = fs
    .readdirSync(environmentsDir)
    .filter((file) => file.endsWith(".ts"))
    .sort();
  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- per-assignment files are loaded dynamically by design
    const mod = require(path.join(environmentsDir, file)) as {
      name?: unknown;
      environment?: unknown;
    };
    if (typeof mod.name !== "string" || mod.name.length === 0) {
      throw new Error(
        `assignment file ${file} does not export a non-empty string 'name'`,
      );
    }
    if (typeof mod.environment !== "object" || mod.environment === null) {
      throw new Error(
        `assignment file ${file} does not export an 'environment' object`,
      );
    }
    if (loaded.has(mod.name)) {
      throw new Error(
        `duplicate assignment name "${mod.name}" in ${file}`,
      );
    }
    loaded.set(mod.name, mod.environment as EnvironmentDescription);
  }
  return loaded;
}

function getEnvironments(): Map<string, EnvironmentDescription> {
  return new Map(
    Array.from(environments.entries())
      .map(([key, value]) => {
        updateEnvironment(value);
        return [key, value];
      })
  );
}

export function updateEnvironments(
  updatedEnvironments: Map<string, EnvironmentDescription>,
): void {
  environments.clear();

  updatedEnvironments.forEach((value, key) => {
    updateEnvironment(value)
    environments.set(key, value);
  });
}

export function updateEnvironment(env: EnvironmentDescription | AssignmentData): void {
  const bonusPoints = env.steps?.reduce((sum, step) => sum + (step.bonusPoints ?? 0), 0) ?? 0;

  if (env.maxBonusPoints !== undefined && bonusPoints > env.maxBonusPoints) {
    env.maxBonusPoints = bonusPoints;
  } else if (env.maxBonusPoints === undefined && bonusPoints > 0) {
    env.maxBonusPoints = bonusPoints;
  }
}

export default getEnvironments();
