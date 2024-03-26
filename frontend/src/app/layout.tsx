import { Metadata } from "next";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import NextAuthProvider, { Providers } from "./providers";
import NavbarComponent from "../components/NavbarComponent";


export const metadata: Metadata = {
  title: {
    default: "Learn SDN Hub",
    template: "%s - Hochschule Fulda",
  },
  description: "Welcome to Learn SDN Hub!",
  applicationName: "Learn SDN Hub",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head />
      <body>
        <Providers>
          <NavbarComponent />
          {children}
        </Providers>
      </body>
    </html>
  );
}
