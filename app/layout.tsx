import type { Metadata } from 'next'
import './globals.css'

import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components'
import { LingoProvider, loadDictionary } from "lingo.dev/react/rsc";


export const metadata: Metadata = {
  title: 'CDox AI - Making documents comprehensible for everyday.',
  description: 'CDox AI - Making legal documents comprehensible for everyday.',
  generator: 'Vivek Kornepalli',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <LingoProvider loadDictionary={(locale) => loadDictionary(locale)}>

    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased'
        )}
      >

        <AuthKitProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </AuthKitProvider>
      </body>
    </html>
    </LingoProvider>
  )
}
