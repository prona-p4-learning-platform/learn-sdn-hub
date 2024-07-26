import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { persister } from "./persister";

interface AuthStoreProps {
  username: string;
  token: string;
  groupNumber: number;
  role: string;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  setAuthentication: (
    username: string,
    groupNumber: number,
    token: string,
    role?: string,
  ) => void;
  clearStorage: () => void;
}

const authStoreDefaults = {
  username: "",
  token: "",
  groupNumber: 0,
  role: "",
};

export const useAuthStore = create<AuthStoreProps>()(
  persist(
    (set, get) => ({
      ...authStoreDefaults,
      isAuthenticated: () => {
        return !!get().token;
      },
      isAdmin: () => {
        return get().role === "admin";
      },
      setAuthentication: (
        username: string,
        groupNumber: number,
        token: string,
        role = "",
      ) => set({ username, groupNumber, token, role }),
      clearStorage: () => set(authStoreDefaults),
    }),
    {
      name: "authStore",
      storage: createJSONStorage(() => persister(authStoreDefaults)),
    },
  ),
);
