import { Header } from './header'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {children}
      </main>
    </div>
  )
}
