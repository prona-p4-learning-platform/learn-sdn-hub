import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { persister } from "./persister";

interface OptionsStoreProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const optionsStoreDefaults = {
  darkMode: false,
};

export const useOptionsStore = create<OptionsStoreProps>()(
  persist(
    (set) => ({
      ...optionsStoreDefaults,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: "optionsStore",
      storage: createJSONStorage(() => persister(optionsStoreDefaults)),
    },
  ),
);
