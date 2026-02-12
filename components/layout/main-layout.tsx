import { Header } from './header'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-screen-2xl py-8 md:py-12">
        {children}
      </main>
    </div>
  )
}
