import { Link } from '@tanstack/react-router'
import HeaderAuth from './HeaderAuth'
import { ModeToggle } from '@/components/theme/ModeToggle'

const NAV_LINKS: Array<{ to: string; label: string; className: string }> = [
  { to: '/', label: 'Home', className: 'hover:text-foreground/80' },
  {
    to: '/pricing',
    label: 'Pricing',
    className: 'text-muted-foreground hover:text-foreground',
  },
  {
    to: '/demo',
    label: 'Demo',
    className: 'text-muted-foreground hover:text-foreground',
  },
]

export default function Header() {
  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-6">
        <nav className="flex gap-6 text-sm font-medium">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={l.className}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <HeaderAuth />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
