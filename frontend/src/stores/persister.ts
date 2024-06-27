import type { StateStorage } from "zustand/middleware";
import { destr } from "destr";
import { z } from "zod";
import isEqual from "lodash-es/isEqual";

const persisterSchema = z.object({
  state: z.record(z.unknown()),
  version: z.number(),
});

/**
 * A custom persister which only saves the state if it
 * differs from the default values.
 *
 * @param defaults The default values.
 * @returns A persister for zustand.
 */
export const persister = (defaults: unknown): StateStorage => {
  return {
    getItem: (name: string) => {
      return localStorage.getItem(name);
    },
    setItem: (name: string, value: string) => {
      const alreadyStored = !!localStorage.getItem(name);
      const parsed = destr(value);
      const validated = persisterSchema.parse(parsed);

      if (alreadyStored || !isEqual(validated.state, defaults)) {
        localStorage.setItem(name, value);
      }
    },
    removeItem: (name: string) => {
      localStorage.removeItem(name);
    },
  } satisfies StateStorage;
};
