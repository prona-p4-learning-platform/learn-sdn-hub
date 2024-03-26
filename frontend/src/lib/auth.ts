import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createApiRequest } from "./Request";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials) {
          return null;
        }
        const request = createApiRequest("/api/user/login", {
          method: "POST",
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await fetch(request);
        if (!result.ok) {
          throw new Error("Fehler bei der Anmeldung");
        }
        if (result.status === 200) {
          const user = await result.json();
          return user;
        } else {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          name: user.name,
          groupNumber: user.groupNumber,
        };
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        return {
          ...session,
          user: {
            id: token.id,
            name: token.name,
            groupNumber: token.groupNumber,
          },
        };
      }
      return session;
    },
  },
  events: {
    signIn: async ({ user, account, profile }) => {
      console.log(`User ${user.name} signed in!`);
    },
  },
  session: {
    maxAge: 24 * 60 * 60, // 24 Tage session gültigkeit
    updateAge: 24 * 60 * 60, // 24 Stunden session gültigkeit
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 Tage jwt gültigkeit
  },
};
