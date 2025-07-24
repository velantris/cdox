import type { Metadata } from 'next'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf-highlighter/dist/style.css'
import './globals.css'

import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { Toaster } from 'sonner'

import { ConvexClientProvider } from '@/components/convex-provider'
import { LingoProvider, loadDictionary } from 'lingo.dev/react/rsc'
import { PostHogProvider } from '@/components/PostHogProvider'

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
        <body className={cn('min-h-screen bg-background font-sans antialiased')}>
          <PostHogProvider>
            <ConvexClientProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <Toaster position="top-right" />
                {children}
              </ThemeProvider>
            </ConvexClientProvider>
          </PostHogProvider>
        </body>
      </html>
    </LingoProvider>
  )
}
