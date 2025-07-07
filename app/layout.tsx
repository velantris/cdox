import type { Metadata } from 'next'
import './globals.css'

import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components'

export const metadata: Metadata = {
  title: 'ClearDoc',
  description: 'ClearDoc',
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
  )
}
