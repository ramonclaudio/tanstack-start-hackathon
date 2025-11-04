import React, { createContext, useContext, useState } from 'react'

import { useCustomer, usePricingTable } from 'autumn-js/react'
import { Loader2, Mail } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { ProductDetails } from 'autumn-js/react'
import type { Product, ProductItem } from 'autumn-js'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import CheckoutDialog from '@/components/autumn/checkout-dialog'
import { getPricingTableContent } from '@/lib/autumn/pricing-table-content'
import { useSession } from '@/lib/auth-client'

export default function PricingTable({
  productDetails,
}: {
  productDetails?: Array<ProductDetails>
}) {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const { customer, checkout } = useCustomer({ errorOnNotFound: false })

  const [isAnnual, setIsAnnual] = useState(false)
  const { products, isLoading, error } = usePricingTable({ productDetails })

  if (isLoading) {
    return (
      <div className="w-full h-full flex justify-center items-center min-h-[300px]">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
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

  const intervals = Array.from(
    new Set(
      products?.map((p) => p.properties.interval_group).filter((i) => !!i),
    ),
  )

  const multiInterval = intervals.length > 1

  const intervalFilter = (product: Product) => {
    if (!product.properties.interval_group) {
      return true
    }

    if (multiInterval) {
      if (isAnnual) {
        return product.properties.interval_group === 'year'
      } else {
        return product.properties.interval_group === 'month'
      }
    }

    return true
  }

  // Sort products in order: Free, Starter, Pro, Enterprise
  const sortProducts = (a: Product, b: Product) => {
    const order = ['free_plan', 'starter_plan', 'pro_plan', 'enterprise_plan']
    const aIndex = order.indexOf(a.id)
    const bIndex = order.indexOf(b.id)

    // If both are in the order array, sort by their position
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    }

    // If only one is in the order array, it comes first
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1

    // If neither is in the order array, maintain original order
    return 0
  }

  const handlePricingCardClick = async (product: Product) => {
    // If user is authenticated and we have a customer, proceed with checkout
    if (session?.user && customer) {
      await checkout({
        productId: product.id,
        dialog: CheckoutDialog,
      })
    } else if (session?.user && !customer) {
      // User is authenticated but customer not yet created
      // This shouldn't happen with AutumnWrapper, but handle gracefully
      console.error('Customer not found for authenticated user')
    } else {
      // User is not authenticated, redirect to sign up
      navigate({ to: '/auth/sign-up' })
    }
  }

  return (
    <div className={cn('root')}>
      {products && (
        <PricingTableContainer
          products={products}
          isAnnualToggle={isAnnual}
          setIsAnnualToggle={setIsAnnual}
          multiInterval={multiInterval}
        >
          {products
            .filter(intervalFilter)
            .sort(sortProducts)
            .map((product, index) => {
              // Special handling for Enterprise plan
              if (product.id === 'enterprise_plan') {
                return (
                  <EnterprisePricingCard
                    key={index}
                    product={product}
                    isAuthenticated={!!session?.user}
                  />
                )
              }

              return (
                <PricingCard
                  key={index}
                  productId={product.id}
                  buttonProps={{
                    disabled:
                      (product.scenario === 'active' &&
                        !product.properties.updateable) ||
                      product.scenario === 'scheduled',

                    onClick: async () => {
                      await handlePricingCardClick(product)
                    },
                  }}
                />
              )
            })}
        </PricingTableContainer>
      )}
    </div>
  )
}

const PricingTableContext = createContext<{
  isAnnualToggle: boolean
  setIsAnnualToggle: (isAnnual: boolean) => void
  products: Array<Product>
  showFeatures: boolean
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
}: {
  children?: React.ReactNode
  products?: Array<Product>
  showFeatures?: boolean
  className?: string
  isAnnualToggle: boolean
  setIsAnnualToggle: (isAnnual: boolean) => void
  multiInterval: boolean
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
      value={{ isAnnualToggle, setIsAnnualToggle, products, showFeatures }}
    >
      <div
        className={cn('flex items-center flex-col', hasRecommended && '!py-10')}
      >
        {multiInterval && (
          <div
            className={cn(
              products.some((p) => p.display?.recommend_text) && 'mb-8',
            )}
          >
            <AnnualSwitch
              isAnnualToggle={isAnnualToggle}
              setIsAnnualToggle={setIsAnnualToggle}
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
  showFeatures?: boolean
  className?: string
  onButtonClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  buttonProps?: React.ComponentProps<'button'>
}

export const PricingCard = ({
  productId,
  className,
  buttonProps,
}: PricingCardProps) => {
  const { products, showFeatures } = usePricingTableContext('PricingCard')

  const product = products.find((p) => p.id === productId)

  if (!product) {
    throw new Error(`Product with id ${productId} not found`)
  }

  const { name, display: productDisplay } = product

  const { buttonText } = getPricingTableContent(product)

  const isRecommended = productDisplay?.recommend_text ? true : false
  const mainPriceDisplay = product.properties.is_free
    ? {
        primary_text: 'Free',
        secondary_text: undefined,
      }
    : (product.items[0]?.display ?? {
        primary_text: '',
        secondary_text: undefined,
      })

  const featureItems = product.properties.is_free
    ? product.items
    : product.items.slice(1)

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
          'flex flex-col h-full flex-grow',
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
              <h3 className="font-semibold h-16 flex px-6 items-center border-y mb-4 bg-secondary/40">
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
          {showFeatures && featureItems.length > 0 && (
            <div className="flex-grow px-6 mb-6">
              <PricingFeatureList
                items={featureItems}
                everythingFrom={product.display?.everything_from}
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
  className,
}: {
  items: Array<ProductItem>
  everythingFrom?: string
  className?: string
}) => {
  return (
    <div className={cn('flex-grow', className)}>
      {everythingFrom && (
        <p className="text-sm mb-4">Everything from {everythingFrom}, plus:</p>
      )}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            {/* {showIcon && (
              <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            )} */}
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
    <div className="bg-secondary absolute border text-muted-foreground text-sm font-medium lg:rounded-full px-3 lg:py-0.5 lg:top-4 lg:right-4 top-[-1px] right-[-1px] rounded-bl-lg">
      {recommended}
    </div>
  )
}

// Enterprise Pricing Card with Email Button
const EnterprisePricingCard = ({
  product,
  isAuthenticated,
}: {
  product: Product
  isAuthenticated: boolean
}) => {
  const { name, display: productDisplay } = product

  const isRecommended = productDisplay?.recommend_text ? true : false
  const mainPriceDisplay = product.properties.is_free
    ? {
        primary_text: 'Free',
        secondary_text: undefined,
      }
    : (product.items[0]?.display ?? {
        primary_text: '',
        secondary_text: undefined,
      })

  const featureItems = product.properties.is_free
    ? product.items
    : product.items.slice(1)

  const handleContactClick = () => {
    const subject = encodeURIComponent('Enterprise Plan Inquiry')
    const body = encodeURIComponent(
      `Hi,\n\nI'm interested in learning more about the Enterprise plan.\n\n${isAuthenticated ? 'I am currently signed in to my account.' : 'Please let me know the next steps.'}\n\nThank you!`,
    )
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`
  }

  return (
    <div
      className={cn(
        'w-full h-full py-6 text-foreground border rounded-lg shadow-sm max-w-xl',
        isRecommended &&
          'lg:-translate-y-6 lg:shadow-lg dark:shadow-zinc-800/80 lg:h-[calc(100%+48px)] bg-secondary/40',
      )}
    >
      {productDisplay?.recommend_text && (
        <RecommendedBadge recommended={productDisplay.recommend_text} />
      )}
      <div
        className={cn(
          'flex flex-col h-full flex-grow',
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
              <h3 className="font-semibold h-16 flex px-6 items-center border-y mb-4 bg-secondary/40">
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
          {featureItems.length > 0 && (
            <div className="flex-grow px-6 mb-6">
              <PricingFeatureList
                items={featureItems}
                everythingFrom={product.display?.everything_from}
              />
            </div>
          )}
        </div>
        <div className={cn('px-6', isRecommended && 'lg:-translate-y-12')}>
          <Button
            className="w-full py-3 px-4 group overflow-hidden relative transition-all duration-300 hover:brightness-90 border rounded-lg"
            variant="secondary"
            onClick={handleContactClick}
          >
            <div className="flex items-center justify-center gap-2 w-full">
              <Mail className="h-4 w-4" />
              <span>Contact Sales</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}
