import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

import './globals.css'
import { MainLayout } from '@/components/layout/main-layout'
import { AuthProvider } from '@/lib/auth-provider'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Workflow Builder',
  description: 'Build and run multi-step text processing workflows',
  generator: 'v0.app',
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: 'Workflow Builder',
    description: 'Build and run multi-step text processing workflows',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <MainLayout>{children}</MainLayout>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

