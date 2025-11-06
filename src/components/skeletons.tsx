import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function CircleSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-8 w-8 rounded-full', className)} />
}

export function NavSkeleton() {
  return (
    <>
      <Skeleton className="h-[14px] w-11 rounded" />
      <Skeleton className="h-[14px] w-[52px] rounded" />
      <Skeleton className="h-[14px] w-32 rounded" />
      <Skeleton className="h-[14px] w-24 rounded" />
    </>
  )
}

export function FooterSkeleton() {
  return <Skeleton className="h-5 w-80 rounded" />
}

export function HeroSkeleton() {
  return (
    <div className="text-center space-y-5">
      <Skeleton className="h-9 w-80 mx-auto" />
      <Skeleton className="h-5 w-full max-w-xl mx-auto" />
    </div>
  )
}

export function SectionHeaderSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-8 w-48 mx-auto', className)} />
}

export function LogoSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-40 w-40 rounded-full', className)} />
}

export function ButtonRowSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex gap-4 justify-center">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-32" />
      ))}
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-16 w-full', className)} />
}

export function ListSkeleton({
  count = 3,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} className={className} />
      ))}
    </div>
  )
}

export function AuthCardSkeleton() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      {/* Card with gap-6 between header and content, py-6, rounded-xl */}
      <div className="w-full max-w-md border rounded-xl shadow-sm bg-card flex flex-col gap-6 py-6">
        {/* CardHeader with gap-2 and px-6 */}
        <div className="px-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-5 w-full max-w-[420px]" />
        </div>
        {/* CardContent with px-6 and space-y-4 */}
        <div className="px-6 space-y-4">
          {/* Form inputs - space-y-4 */}
          <div className="space-y-4">
            {/* Email input - space-y-2 */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            {/* Password input - space-y-2 */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            {/* Submit button */}
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Divider with "Or continue with" text */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 relative z-10">
                <Skeleton className="h-3 w-28" />
              </span>
            </div>
          </div>

          {/* GitHub button with icon */}
          <Skeleton className="h-10 w-full rounded-md" />

          {/* Bottom text with link */}
          <div className="text-center">
            <Skeleton className="h-5 w-56 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function SignUpCardSkeleton() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      {/* Card with gap-6 between header and content, py-6, rounded-xl */}
      <div className="w-full max-w-md border rounded-xl shadow-sm bg-card flex flex-col gap-6 py-6">
        {/* CardHeader with gap-2 and px-6 */}
        <div className="px-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-full max-w-[420px]" />
        </div>
        {/* CardContent with px-6 and space-y-4 */}
        <div className="px-6 space-y-4">
          {/* Form inputs - space-y-4 */}
          <div className="space-y-4">
            {/* Name input - space-y-2 */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            {/* Email input - space-y-2 */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            {/* Password input - space-y-2 */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            {/* Submit button */}
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Divider with "Or continue with" text */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 relative z-10">
                <Skeleton className="h-3 w-28" />
              </span>
            </div>
          </div>

          {/* GitHub button with icon */}
          <Skeleton className="h-10 w-full rounded-md" />

          {/* Bottom text with link */}
          <div className="text-center">
            <Skeleton className="h-5 w-64 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function FormRowSkeleton() {
  return (
    <div className="flex gap-2">
      <Skeleton className="flex-1 h-14 rounded-md" />
      <Skeleton className="h-14 w-24 rounded-md" />
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-10 w-48 mb-3" />
      <Skeleton className="h-6 w-64" />
    </div>
  )
}

export function AvatarCardSkeleton() {
  return (
    <div className="flex items-start gap-4">
      <CircleSkeleton className="h-16 w-16" />
      <div className="flex-1 space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-[22px] w-28 rounded-full" />
          <Skeleton className="h-[22px] w-24 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function VerticalButtonListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function ButtonWithIconSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-9 w-full rounded-md', className)} />
}

export function QuickActionsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ButtonWithIconSkeleton key={i} />
      ))}
    </div>
  )
}

export function FeatureUsageListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function SubscriptionStatusSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
        <div>
          <Skeleton className="h-5 w-28 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}

export function FeatureUsageSingleSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
}

export function PricingGridSkeleton({
  count = 3,
  withContainer = true,
  className,
}: {
  count?: number
  withContainer?: boolean
  className?: string
}) {
  const cards = (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full h-full py-6 border rounded-lg shadow-sm max-w-xl"
        >
          <div className="flex flex-col h-full">
            <div className="pb-4">
              <Skeleton className="h-7 w-40 mx-6 mb-1" />
            </div>
            <div className="mb-2">
              <div className="border-y bg-secondary/40 h-16 flex items-center px-6 mb-2">
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <div className="px-6 mb-6">
              <Skeleton className="h-4 w-52" />
            </div>
            <div className="px-6 mt-auto">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      ))}
    </>
  )

  if (!withContainer) return cards

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] w-full gap-2',
        className,
      )}
    >
      {cards}
    </div>
  )
}

// Pricing toggle (Monthly | Annual) skeleton
export function PricingToggleSkeleton() {
  return (
    <div className="flex items-center space-x-2">
      <Skeleton className="h-4 w-14" />
      <Skeleton className="h-6 w-10 rounded-full" />
      <Skeleton className="h-4 w-14" />
    </div>
  )
}

// "Why Choose Us" cards skeleton (3-up)
export function WhyChooseGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border rounded-lg p-6 bg-card">
          <div className="w-12 h-12 rounded-full bg-accent animate-pulse mb-4" />
          <Skeleton className="h-5 w-32 mb-2" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

// FAQ accordion items skeleton
export function FAQAccordionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border rounded-lg px-4 h-13.5 flex items-center justify-between"
        >
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      ))}
    </div>
  )
}
