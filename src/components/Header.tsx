import { Link } from '@tanstack/react-router'
import { User } from 'lucide-react'
import { ModeToggle } from './mode-toggle'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Skeleton } from './ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { signOut, useSession } from '@/lib/auth-client'

export default function Header() {
  const { data: session, isPending } = useSession()

  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-6">
        <nav className="flex gap-6 text-sm font-medium">
          {isPending ? (
            <>
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-foreground/80">
                Home
              </Link>
              {/* Features page removed */}
              <Link
                to="/pricing"
                className="text-muted-foreground hover:text-foreground"
              >
                Pricing
              </Link>
              <Link
                to="/demo/start/server-funcs"
                className="text-muted-foreground hover:text-foreground"
              >
                Server Functions
              </Link>
              <Link
                to="/demo/start/api-request"
                className="text-muted-foreground hover:text-foreground"
              >
                API Request
              </Link>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {isPending ? (
            <>
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    {session?.user ? (
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
              <ModeToggle />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
