'use client'

import { SessionProvider } from 'next-auth/react'
import { NotificationProvider } from '../lib/context/NotificationContext'

import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthProvider>
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </NextAuthProvider>
  )
}

export default function NextAuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  return <SessionProvider> {children} </SessionProvider>
}