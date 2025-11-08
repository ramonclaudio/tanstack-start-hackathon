import { Link } from '@tanstack/react-router'
import { User } from 'lucide-react'
import { ModeToggle } from './ModeToggle'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { CircleSkeleton, NavSkeleton } from './skeletons'
import { useGlobalLoading } from './GlobalLoading'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { signOut, useSession } from '@/lib/auth'

const NAV_LINKS: Array<{ to: string; label: string; className: string }> = [
  { to: '/', label: 'Home', className: 'hover:text-foreground/80' },
  {
    to: '/pricing',
    label: 'Pricing',
    className: 'text-muted-foreground hover:text-foreground',
  },
  {
    to: '/demo/start/server-funcs',
    label: 'Server Functions',
    className: 'text-muted-foreground hover:text-foreground',
  },
  {
    to: '/demo/start/api-request',
    label: 'API Request',
    className: 'text-muted-foreground hover:text-foreground',
  },
]

export default function Header() {
  const { data: session, isPending } = useSession()
  const { pageLoading } = useGlobalLoading()
  const loading = isPending || pageLoading

  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-6">
        <nav className="flex gap-6 text-sm font-medium">
          {loading ? (
            <NavSkeleton />
          ) : (
            NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={l.className}>
                {l.label}
              </Link>
            ))
          )}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
              >
                {loading ? (
                  <CircleSkeleton />
                ) : session?.user ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={session.user.image || ''}
                      alt={session.user.name || ''}
                    />
                    <AvatarFallback>
                      {session.user.name
                        ? session.user.name.charAt(0).toUpperCase()
                        : 'U'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              {session?.user ? (
                <>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/pricing" className="cursor-pointer">
                      Pricing & Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut()
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/auth/sign-in" className="cursor-pointer">
                      Sign In
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/auth/sign-up" className="cursor-pointer">
                      Sign Up
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {loading ? <CircleSkeleton /> : <ModeToggle />}
        </div>
      </div>
    </header>
  )
}
