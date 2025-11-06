import React, { createContext, useContext, useState } from 'react'

import { usePricingTable } from 'autumn-js/react'
import { Loader2 } from 'lucide-react'
import { useAction } from 'convex/react'
import * as Sentry from '@sentry/tanstackstart-react'
import { api } from '../../../convex/_generated/api'
import type { ProductDetails } from 'autumn-js/react'
import type { CheckoutResult, Product, ProductItem } from 'autumn-js'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import {
  PricingGridSkeleton,
  PricingToggleSkeleton,
} from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import CheckoutDialog from '@/components/pricing/CheckoutDialog'
import { useSession } from '@/lib/auth-client'

// Minimal product shape compatible with our backend schema and autumn-js
type ProductItemLike = {
  included_usage?: number | 'inf'
  interval?: string | null
  feature_id?: string | null
  display?: { primary_text?: string; secondary_text?: string }
}

type ProductLike = {
  id: string
  name?: string
  is_add_on: boolean
  items: Array<ProductItem | ProductItemLike>
  properties: {
    is_free: boolean
    is_one_off: boolean
    updateable?: boolean
    interval_group?: string | null
    has_trial?: boolean
  }
  display?: {
    name?: string
    description?: string
    button_text?: string
    recommend_text?: string
    everything_from?: string
  }
  scenario?: string
}

// Helper to determine button text based on product scenario
function getButtonText(
  product: Product | ProductLike,
  isAuthenticated: boolean,
): React.ReactNode {
  if (!isAuthenticated) {
    return <p>Get Started</p>
  }

  const { scenario, properties } = product
  const { is_one_off, updateable, has_trial } = properties

  if (has_trial) {
    return <p>Start Free Trial</p>
  }

  switch (scenario) {
    case 'scheduled':
      return <p>Plan Scheduled</p>
    case 'active':
      return updateable ? <p>Update Plan</p> : <p>Current Plan</p>
    case 'new':
      return is_one_off ? <p>Purchase</p> : <p>Get started</p>
    case 'renew':
      return <p>Renew</p>
    case 'upgrade':
      return <p>Upgrade</p>
    case 'downgrade':
      return <p>Downgrade</p>
    case 'cancel':
      return <p>Cancel Plan</p>
    default:
      return <p>Get Started</p>
  }
}

export default function PricingTable({
  productDetails,
  products: productsProp,
  customer,
  loading = false,
  initialInterval,
  selectedPlan,
  onIntervalChange,
  onSelectPlan,
  onPlanChanged,
}: {
  productDetails?: Array<ProductDetails>
  products?: Array<Product | ProductLike>
  customer?: { products?: Array<{ id: string; status?: string }> } | null
  loading?: boolean
  initialInterval?: 'month' | 'year'
  selectedPlan?: string
  onIntervalChange?: (interval: 'month' | 'year') => void
  onSelectPlan?: (planId: string) => void
  onPlanChanged?: () => Promise<void> | void
}) {
  const { data: session } = useSession()
  const prepareCheckout = useAction(api.autumn.checkout)

  const [isAnnual, setIsAnnual] = useState(initialInterval === 'year')
  React.useEffect(() => {
    if (initialInterval) setIsAnnual(initialInterval === 'year')
  }, [initialInterval])
  // Dialog state must be declared before any early returns to keep hook order stable
  const [open, setOpen] = useState(false)
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(
    null,
  )

  const hook = usePricingTable({ productDetails })
  const products = (productsProp ? productsProp : hook.products) as Array<
    Product | ProductLike
  >
  const isLoading = productsProp ? !!loading : hook.isLoading
  const error = productsProp ? null : hook.error

  // Compute derived values before any early returns to maintain hook order
  const safeProducts = Array.isArray(products) ? products : []
  const filtered = safeProducts.filter((p: any) => !p?.is_add_on)
  const displayProducts = filtered.length > 0 ? filtered : safeProducts
  const intervals = Array.from(
    new Set(
      displayProducts
        .map((p: any) => p?.properties?.interval_group)
        .filter((i) => !!i),
    ),
  )
  const multiInterval = intervals.length > 1

  // useMemo must be called before any early returns
  const filteredAndSortedProducts = React.useMemo(() => {
    const intervalFilter = (product: Product | ProductLike) => {
      const group = (product as any)?.properties?.interval_group
      if (!group || !multiInterval) {
        return true
      }
      return isAnnual ? group === 'year' : group === 'month'
    }

    const sortProducts = (
      a: Product | ProductLike,
      b: Product | ProductLike,
    ) => {
      const order = ['free_plan', 'starter_plan', 'pro_plan']
      const aIndex = order.indexOf(a.id)
      const bIndex = order.indexOf(b.id)

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return 0
    }

    return displayProducts.filter(intervalFilter).sort(sortProducts)
  }, [displayProducts, isAnnual, multiInterval])

  // Derive per-product status from provided customer snapshot
  type CustProd = { id: string; status?: string }
  const custProducts: Array<CustProd> = Array.isArray(customer?.products)
    ? (customer.products as Array<unknown>).filter(
        (p): p is CustProd => !!p && typeof p === 'object' && 'id' in p,
      )
    : []
  const productStatus = new Map<string, string | undefined>(
    custProducts.map((p) => [p.id, p.status]),
  )

  // NOW we can have early returns after all hooks are called
  if (isLoading) {
    const countFromProps = Array.isArray(productsProp)
      ? productsProp.filter((p) => !p.is_add_on).length || productsProp.length
      : 0
    const skeletonCount = Math.max(countFromProps || 3, 1)

    return (
      <div className="flex items-center flex-col">
        <div className="mb-4">
          <PricingToggleSkeleton />
        </div>
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] w-full gap-2',
          )}
        >
          <PricingGridSkeleton count={skeletonCount} withContainer={false} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex justify-center items-center min-h-[300px]">
        <div className="text-center">
          <p className="text-destructive font-medium mb-2">
            Something went wrong loading pricing
          </p>
          <p className="text-sm text-muted-foreground">
            Please try refreshing the page or contact support if the issue
            persists.
          </p>
        </div>
      </div>
    )
  }

  const handlePricingCardClick = async (product: Product | ProductLike) => {
    if (!session?.user) {
      window.location.assign('/auth/sign-up')
      return
    }
    try {
      const response = await prepareCheckout({ productId: product.id })
      if (response && 'data' in response && response.data) {
        setCheckoutResult(response.data)
        setOpen(true)
      }
    } catch (e) {
      console.error('Failed to prepare checkout', e)
    }
  }

  return (
    <div>
      {displayProducts.length > 0 ? (
        <PricingTableContainer
          products={displayProducts}
          isAnnualToggle={isAnnual}
          setIsAnnualToggle={setIsAnnual}
          multiInterval={multiInterval}
          isAuthenticated={!!session?.user}
          onIntervalToggle={(val) => onIntervalChange?.(val ? 'year' : 'month')}
        >
          {filteredAndSortedProducts.map((product, index) => {
            const status = productStatus.get(product.id)
            const isActiveOrTrial = status === 'active' || status === 'trialing'
            const isScheduled = status === 'scheduled'

            return (
              <PricingCard
                key={index}
                productId={product.id}
                isCurrentPlan={isActiveOrTrial}
                className={cn(
                  selectedPlan === product.id && 'border-primary/60',
                  isActiveOrTrial && 'border-2 border-primary',
                )}
                buttonProps={{
                  disabled: session?.user
                    ? (isActiveOrTrial &&
                        !(product as any)?.properties?.updateable) ||
                      isScheduled
                    : false,

                  onClick: async () => {
                    onSelectPlan?.(product.id)
                    await handlePricingCardClick(product)
                  },
                }}
              />
            )
          })}
        </PricingTableContainer>
      ) : (
        <div className="w-full text-center text-muted-foreground py-8">
          No plans available.
        </div>
      )}
      {open && checkoutResult && (
        <CheckoutDialog
          open={open}
          setOpen={(o) => {
            setOpen(o)
            if (!o && onPlanChanged) onPlanChanged()
          }}
          checkoutResult={checkoutResult}
        />
      )}
    </div>
  )
}

const PricingTableContext = createContext<{
  isAnnualToggle: boolean
  setIsAnnualToggle: (isAnnual: boolean) => void
  products: Array<Product | ProductLike>
  showFeatures: boolean
  isAuthenticated: boolean
} | null>(null)

export const usePricingTableContext = (componentName: string) => {
  const context = useContext(PricingTableContext)

  if (!context) {
    throw new Error(`${componentName} must be used within <PricingTable />`)
  }

  return context
}

export const PricingTableContainer = ({
  children,
  products,
  showFeatures = true,
  className,
  isAnnualToggle,
  setIsAnnualToggle,
  multiInterval,
  onIntervalToggle,
  isAuthenticated,
}: {
  children?: React.ReactNode
  products?: Array<Product | ProductLike>
  showFeatures?: boolean
  className?: string
  isAnnualToggle: boolean
  setIsAnnualToggle: (isAnnual: boolean) => void
  multiInterval: boolean
  onIntervalToggle?: (isAnnual: boolean) => void
  isAuthenticated: boolean
}) => {
  if (!products) {
    throw new Error('products is required in <PricingTable />')
  }

  if (products.length === 0) {
    return <></>
  }

  const hasRecommended = products.some((p) => p.display?.recommend_text)
  return (
    <PricingTableContext.Provider
      value={{
        isAnnualToggle,
        setIsAnnualToggle,
        products,
        showFeatures,
        isAuthenticated,
      }}
    >
      <div
        className={cn('flex items-center flex-col', hasRecommended && 'py-10!')}
      >
        {multiInterval && (
          <div
            className={cn(
              products.some((p) => p.display?.recommend_text) && 'mb-8',
            )}
          >
            <AnnualSwitch
              isAnnualToggle={isAnnualToggle}
              setIsAnnualToggle={(val) => {
                setIsAnnualToggle(val)
                onIntervalToggle?.(val)
              }}
            />
          </div>
        )}
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] w-full gap-2',
            className,
          )}
        >
          {children}
        </div>
      </div>
    </PricingTableContext.Provider>
  )
}

interface PricingCardProps {
  productId: string
  className?: string
  buttonProps?: React.ComponentProps<'button'>
  isCurrentPlan?: boolean
}

export const PricingCard = ({
  productId,
  className,
  buttonProps,
  isCurrentPlan = false,
}: PricingCardProps) => {
  const { products, showFeatures, isAuthenticated } =
    usePricingTableContext('PricingCard')

  const product = products.find((p) => p.id === productId)

  if (!product) {
    throw new Error(`Product with id ${productId} not found`)
  }

  const { name, display: productDisplay } = product as any

  // Override button text for current plan
  const buttonText = isCurrentPlan ? (
    <p>Current Plan</p>
  ) : (
    getButtonText(product, isAuthenticated)
  )

  const isRecommended = productDisplay?.recommend_text ? true : false
  const isFree = Boolean((product as any)?.properties?.is_free)
  const itemsList = Array.isArray((product as any)?.items)
    ? ((product as any).items as Array<any>)
    : []
  const mainPriceDisplay = isFree
    ? {
        primary_text: 'Free',
        secondary_text: undefined,
      }
    : (itemsList[0]?.display ?? {
        primary_text: '',
        secondary_text: undefined,
      })

  // Base list of feature items shown under the price
  const itemsBase = isFree ? itemsList : itemsList.slice(1)

  // Extract a credit summary (e.g., "50 credits / month") and remove that item from the list to avoid duplication
  const creditItem = itemsBase.find(
    (it) =>
      typeof it.included_usage !== 'undefined' &&
      (it.interval === 'day' ||
        it.interval === 'week' ||
        it.interval === 'month' ||
        it.interval === 'year' ||
        it.interval === 'quarter' ||
        it.interval === 'semi_annual'),
  )
  const featureItems = itemsBase.filter((it) => it !== creditItem)

  const formatInterval = (interval?: string) => {
    switch (interval) {
      case 'day':
        return 'day'
      case 'week':
        return 'week'
      case 'month':
        return 'month'
      case 'quarter':
        return 'quarter'
      case 'semi_annual':
        return 'half-year'
      case 'year':
        return 'year'
      default:
        return undefined
    }
  }

  const creditSummary = (() => {
    if (!creditItem) return null
    const units = creditItem.included_usage
    const intervalLabel = formatInterval(creditItem.interval ?? undefined)
    if (!intervalLabel) return null
    if (units === 'inf') return 'Unlimited credits / ' + intervalLabel
    if (typeof units === 'number') return `${units} credits / ${intervalLabel}`
    return null
  })()

  return (
    <div
      className={cn(
        ' w-full h-full py-6 text-foreground border rounded-lg shadow-sm max-w-xl',
        isRecommended &&
          'lg:-translate-y-6 lg:shadow-lg dark:shadow-zinc-800/80 lg:h-[calc(100%+48px)] bg-secondary/40',
        className,
      )}
    >
      {productDisplay?.recommend_text && (
        <RecommendedBadge recommended={productDisplay.recommend_text} />
      )}
      <div
        className={cn(
          'flex flex-col h-full grow',
          isRecommended && 'lg:translate-y-6',
        )}
      >
        <div className="h-full">
          <div className="flex flex-col">
            <div className="pb-4">
              <h2 className="text-2xl font-semibold px-6 truncate">
                {productDisplay?.name || name}
              </h2>
              {productDisplay?.description && (
                <div className="text-sm text-muted-foreground px-6 h-8">
                  <p className="line-clamp-2">{productDisplay.description}</p>
                </div>
              )}
            </div>
            <div className="mb-2">
              <h3 className="font-semibold h-16 flex px-6 items-center border-y mb-2 bg-secondary/40">
                <div className="line-clamp-2">
                  {mainPriceDisplay.primary_text}{' '}
                  {mainPriceDisplay.secondary_text && (
                    <span className="font-normal text-muted-foreground mt-1">
                      {mainPriceDisplay.secondary_text}
                    </span>
                  )}
                </div>
              </h3>
            </div>
          </div>
          {showFeatures && (featureItems.length > 0 || !!creditSummary) && (
            <div className="grow px-6 mb-6">
              <PricingFeatureList
                items={featureItems}
                everythingFrom={product.display?.everything_from}
                extraBullets={
                  creditSummary ? [`Includes ${creditSummary}`] : undefined
                }
              />
            </div>
          )}
        </div>
        <div className={cn(' px-6 ', isRecommended && 'lg:-translate-y-12')}>
          <PricingCardButton
            recommended={productDisplay?.recommend_text ? true : false}
            {...buttonProps}
          >
            {productDisplay?.button_text || buttonText}
          </PricingCardButton>
        </div>
      </div>
    </div>
  )
}

// Pricing Feature List
export const PricingFeatureList = ({
  items,
  everythingFrom,
  extraBullets,
  className,
}: {
  items: Array<ProductItem | ProductItemLike>
  everythingFrom?: string
  extraBullets?: Array<string>
  className?: string
}) => {
  return (
    <div className={cn('grow', className)}>
      {everythingFrom && (
        <p className="text-sm mb-4">Everything from {everythingFrom}, plus:</p>
      )}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <div className="flex flex-col">
              <span>{item.display?.primary_text}</span>
              {item.display?.secondary_text && (
                <span className="text-sm text-muted-foreground">
                  {item.display.secondary_text}
                </span>
              )}
            </div>
          </div>
        ))}
        {extraBullets?.map((text, i) => (
          <div key={`extra-${i}`} className="flex items-start gap-2 text-sm">
            <div className="flex flex-col">
              <span>{text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Pricing Card Button
export interface PricingCardButtonProps extends React.ComponentProps<'button'> {
  recommended?: boolean
  buttonUrl?: string
}

export const PricingCardButton = React.forwardRef<
  HTMLButtonElement,
  PricingCardButtonProps
>(({ recommended, children, className, onClick, ...props }, ref) => {
  const [loading, setLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true)
    try {
      await onClick?.(e)
    } catch (error) {
      console.error(error)
      Sentry.captureException(error, {
        tags: {
          component: 'PricingTable',
          action: 'buttonClick',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      className={cn(
        'w-full py-3 px-4 group overflow-hidden relative transition-all duration-300 hover:brightness-90 border rounded-lg',
        className,
      )}
      {...props}
      variant={recommended ? 'default' : 'secondary'}
      ref={ref}
      disabled={loading || props.disabled}
      onClick={handleClick}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <div className="flex items-center justify-between w-full transition-transform duration-300 group-hover:translate-y-[-130%]">
            <span>{children}</span>
            <span className="text-sm">→</span>
          </div>
          <div className="flex items-center justify-between w-full absolute px-4 translate-y-[130%] transition-transform duration-300 group-hover:translate-y-0 mt-2 group-hover:mt-0">
            <span>{children}</span>
            <span className="text-sm">→</span>
          </div>
        </>
      )}
    </Button>
  )
})
PricingCardButton.displayName = 'PricingCardButton'

// Annual Switch
export const AnnualSwitch = ({
  isAnnualToggle,
  setIsAnnualToggle,
}: {
  isAnnualToggle: boolean
  setIsAnnualToggle: (isAnnual: boolean) => void
}) => {
  return (
    <div className="flex items-center space-x-2 mb-4">
      <span className="text-sm text-muted-foreground">Monthly</span>
      <Switch
        id="annual-billing"
        checked={isAnnualToggle}
        onCheckedChange={setIsAnnualToggle}
      />
      <span className="text-sm text-muted-foreground">Annual</span>
    </div>
  )
}

export const RecommendedBadge = ({ recommended }: { recommended: string }) => {
  return (
    <div className="bg-secondary absolute border text-muted-foreground text-sm font-medium lg:rounded-full px-3 lg:py-0.5 lg:top-4 lg:right-4 rounded-bl-lg">
      {recommended}
    </div>
  )
}

// Enterprise flow removed
