import { v } from 'convex/values'

// Convex validators for snapshot data we persist

export const VIncludedUsage = v.union(v.number(), v.literal('inf'))

export const VInterval = v.union(
  v.literal('minute'),
  v.literal('hour'),
  v.literal('day'),
  v.literal('week'),
  v.literal('month'),
  v.literal('quarter'),
  v.literal('semi_annual'),
  v.literal('year'),
)

export const VCustomerFeature = v.object({
  balance: v.optional(v.union(v.number(), v.null())),
  unlimited: v.optional(v.boolean()),
  included_usage: v.optional(VIncludedUsage),
  interval: v.optional(VInterval),
})

export const VCustomerProduct = v.object({
  id: v.string(),
  name: v.optional(v.union(v.string(), v.null())),
  group: v.optional(v.union(v.string(), v.null())),
  status: v.union(
    v.literal('active'),
    v.literal('trialing'),
    v.literal('scheduled'),
    v.literal('past_due'),
    v.literal('expired'),
  ),
})

export const VCustomer = v.object({
  id: v.optional(v.union(v.string(), v.null())),
  products: v.array(VCustomerProduct),
  features: v.record(v.string(), VCustomerFeature),
})

// Optional product validators (for caching/storage)
export const VProductItemDisplay = v.object({
  primary_text: v.optional(v.string()),
  secondary_text: v.optional(v.string()),
})

export const VProductItem = v.object({
  type: v.optional(v.string()),
  feature_id: v.optional(v.string()),
  included_usage: v.optional(VIncludedUsage),
  interval: v.optional(VInterval),
  usage_model: v.optional(v.string()),
  price: v.optional(v.number()),
  billing_units: v.optional(v.number()),
  display: v.optional(VProductItemDisplay),
})

export const VProductDisplay = v.object({
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  button_text: v.optional(v.string()),
  recommend_text: v.optional(v.string()),
  everything_from: v.optional(v.string()),
})

export const VProductProperties = v.object({
  is_free: v.boolean(),
  is_one_off: v.boolean(),
  interval_group: v.optional(v.union(v.string(), v.null())),
  has_trial: v.optional(v.boolean()),
  updateable: v.optional(v.boolean()),
})

export const VProduct = v.object({
  id: v.string(),
  name: v.optional(v.string()),
  is_add_on: v.boolean(),
  items: v.array(VProductItem),
  properties: VProductProperties,
  display: v.optional(VProductDisplay),
  scenario: v.optional(v.string()),
})
