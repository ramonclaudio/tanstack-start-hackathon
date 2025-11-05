import { unwrap } from './utils'
import type { z } from 'zod'

export function unwrapAndParse<T extends z.ZodTypeAny>(
  x: unknown,
  schema: T,
): z.infer<T> | null {
  const data = unwrap<unknown>(x as any)
  const parsed = schema.safeParse(data ?? null)
  return parsed.success ? parsed.data : null
}
