import { useGlobalLoading } from './GlobalLoading'
import { useSession } from '@/lib/auth-client'
import { FooterSkeleton } from '@/components/skeletons'

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  const { isPending } = useSession()
  const { pageLoading } = useGlobalLoading()
  const loading = isPending || pageLoading
  return (
    <footer className="border-t">
      <div className="flex h-16 items-center justify-center px-6">
        {loading ? (
          <FooterSkeleton />
        ) : (
          <p className="text-sm text-muted-foreground">
            © {CURRENT_YEAR} TanStack Start. All rights reserved.
          </p>
        )}
      </div>
    </footer>
  )
}
