import { z } from 'zod'

export function actionResultSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.boolean(),
    data: data.optional(),
    error: z
      .object({
        message: z.string(),
      })
      .optional(),
  })
}
