import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

import './globals.css'
import { MainLayout } from '@/components/layout/main-layout'
import { AuthProvider } from '@/lib/auth-provider'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Workflow Builder',
  description: 'Chain LLM text steps into a pipeline, run it, and inspect every step. Try templates without an account.',
  metadataBase: new URL('https://workflow-builder-umber.vercel.app'),
  openGraph: {
    title: 'Workflow Builder',
    description: 'Chain LLM text steps into a pipeline, run it, and inspect every step. Try templates without an account.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
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

