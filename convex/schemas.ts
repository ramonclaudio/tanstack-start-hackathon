import { z } from 'zod'

/**
 * Schema Strategy for Autumn API Integration:
 *
 * We use .passthrough() on all schemas that come from the Autumn API to:
 * 1. Allow future API updates without breaking our app
 * 2. Validate only the fields we actually use
 * 3. Pass through unknown fields transparently
 *
 * This gives us:
 * - Type safety for fields we use
 * - Resilience to API changes
 * - Runtime validation with Zod
 * - Compile-time checks with TypeScript
 */
export const ProductStatusSchema = z.enum([
  'active',
  'expired',
  'trialing',
  'scheduled',
  'past_due',
])

export const CustomerProductSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    group: z.string().nullable().optional(),
    status: ProductStatusSchema,
  })
  .passthrough()

export const CustomerFeatureSchema = z
  .object({
    balance: z.number().nullable().optional(),
    unlimited: z.boolean().optional(),
    included_usage: z.union([z.number(), z.literal('inf')]).optional(),
    interval: z
      .enum([
        'minute',
        'hour',
        'day',
        'week',
        'month',
        'quarter',
        'semi_annual',
        'year',
      ])
      .optional(),
  })
  .passthrough()

// Product schemas (subset we consume in UI)
export const ProductItemDisplaySchema = z
  .object({
    primary_text: z.string().optional(),
    secondary_text: z.string().optional(),
  })
  .partial()

export const ProductItemSchema = z
  .object({
    type: z.string().optional(),
    feature_id: z.string().nullable().optional(),
    included_usage: z.union([z.number(), z.literal('inf')]).optional(),
    interval: z.string().nullable().optional(),
    usage_model: z.string().optional(),
    price: z.number().optional(),
    billing_units: z.number().optional(),
    display: ProductItemDisplaySchema.optional(),
  })
  .passthrough() // Allow unknown fields from Autumn API

export const ProductDisplaySchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    button_text: z.string().optional(),
    recommend_text: z.string().optional(),
    everything_from: z.string().optional(),
  })
  .partial()

export const ProductPropertiesSchema = z.object({
  is_free: z.boolean(),
  is_one_off: z.boolean(),
  interval_group: z.string().optional(),
  has_trial: z.boolean().default(false),
  updateable: z.boolean().default(false),
})

// Full product schema from Autumn API (with all fields)
// Using .passthrough() to allow unknown fields from future API updates
export const ProductSchema = z
  .object({
    // Required fields we use
    id: z.string(),
    name: z.string(),
    is_add_on: z.boolean(),
    items: z.array(ProductItemSchema),
    properties: ProductPropertiesSchema,
    // Optional fields we use
    display: ProductDisplaySchema.optional(),
    scenario: z.string().optional(),
    // Additional fields from Autumn API (for reference)
    archived: z.boolean().optional(),
    base_variant_id: z.string().nullable().optional(),
    created_at: z.number().optional(),
    env: z.string().optional(),
    free_trial: z.any().optional(),
    group: z.string().nullable().optional(),
    is_default: z.boolean().optional(),
    version: z.number().optional(),
  })
  .passthrough() // Allow unknown fields for future-proofing

export const CustomerSchema = z
  .object({
    id: z.string().nullable().optional(),
    products: z.array(CustomerProductSchema).default([]),
    features: z.record(z.string(), CustomerFeatureSchema).default({}),
  })
  .passthrough()

export const DashboardDTO = z.object({
  authenticated: z.boolean(),
  user: z
    .object({
      id: z.string(),
      name: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      image: z.string().optional().nullable(),
      createdAt: z.union([z.string(), z.number(), z.date()]),
      emailVerified: z.boolean().optional(),
      twoFactorEnabled: z.boolean().optional(),
    })
    .nullable(),
  customer: CustomerSchema.nullable(),
})

export const PricingDTO = z.object({
  authenticated: z.boolean(),
  products: z.array(ProductSchema).default([]),
  customer: CustomerSchema.nullable(),
})

// Products query response from cache
export const ProductsQueryResponse = z.object({
  products: z.array(ProductSchema),
  stale: z.boolean(),
  updatedAt: z.number(),
})

// Minimal checkout result schema used by server validation
export const CheckoutLineSchema = z
  .object({ description: z.string(), amount: z.number() })
  .passthrough()

export const CheckoutResultSchema = z
  .object({
    product: z
      .object({
        id: z.string(),
        properties: z.object({ is_free: z.boolean() }),
      })
      .passthrough(),
    options: z
      .array(z.object({ feature_id: z.string(), quantity: z.number() }))
      .optional()
      .default([]),
    has_prorations: z.boolean().optional(),
    lines: z.array(CheckoutLineSchema).optional().default([]),
    total: z.number(),
    currency: z.string(),
    next_cycle: z
      .object({
        starts_at: z.union([z.string(), z.number(), z.date()]),
        total: z.number(),
      })
      .optional(),
  })
  .passthrough()

export const WebhookPayload = z
  .object({
    customer_id: z.string().optional(),
    customerId: z.string().optional(),
    customer: CustomerSchema.optional(),
    data: z.object({ customer: CustomerSchema.optional() }).optional(),
  })
  .passthrough()
