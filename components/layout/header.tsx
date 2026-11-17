'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Workflow, Menu, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth-provider'
import { toast } from 'sonner'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, signOut } = useAuth()

  const links = [
    { href: '/', label: 'Home' },
    { href: '/builder', label: 'Builder' },
    { href: '/history', label: 'History' },
    { href: '/status', label: 'Status' },
    { href: '/docs/api', label: 'API' },
  ]

  const isActive = (href: string) => pathname === href

  const handleSignOut = async () => {
    await signOut()
    toast.success('Logged out successfully')
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Workflow className="h-6 w-6 text-primary shrink-0" />
            <span className="font-bold text-base sm:text-lg truncate">Workflow Builder</span>
          </Link>
          <nav className="hidden md:flex gap-1" aria-label="Main">
            {links.map((link) => (
              <Button key={link.href} asChild variant={isActive(link.href) ? 'default' : 'ghost'} size="sm" className="text-sm">
                <Link href={link.href} aria-current={isActive(link.href) ? 'page' : undefined}>
                  {link.label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Auth section */}
          {!isLoading && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="hidden sm:inline text-sm max-w-[150px] truncate">
                        {user.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">Logged in as</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link href="/login" aria-label="Log in">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                </Button>
              )}
            </>
          )}

          {/* Mobile menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {links.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href}>{link.label}</Link>
                  </DropdownMenuItem>
                ))}
                {user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </>
                )}
                {!user && !isLoading && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/login">Login</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/signup">Sign up</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
