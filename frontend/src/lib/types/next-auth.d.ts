import type { User } from "next-auth";
import { JWT } from "next-auth/jwt/types";

declare module "next-auth/jwt" {
  interface JWT {
    user: User;
  }
}

declare module "next-auth" {
  interface Session {
    user: User;
  }

  interface User {
    name: string;
    id: string;
    groupNumber: number;
  }
}
