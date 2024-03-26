import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

export default withAuth(function middleware(request: NextRequest) {}, {
  callbacks: {
    authorized: ({ req, token }) => {
      console.log("Middleware");
      // Beispiel für eine einfache Berechtigungsprüfung mit Rollen
      if (req.url.includes("/admin")) {
        if (token?.role === "ADMIN") {
          return true;
        } else {
          return false;
        }
      } else {
        if (token?.name) {
          return true;
        } else {
          return false;
        }
      }
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/:path*"],
};
