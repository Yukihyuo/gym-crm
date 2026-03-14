import { z } from 'zod'

export const DIET_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const

export const DIET_MEALS = [
  'breakfast',
  'brunch',
  'lunch',
  'snack',
  'dinner'
] as const

const optionalMealText = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  },
  z.string().nullable().optional()
)

export const DayDietSchema = z.object({
  breakfast: optionalMealText,
  brunch: optionalMealText,
  lunch: optionalMealText,
  snack: optionalMealText,
  dinner: optionalMealText
})

export const PlanSchema = z.object({
  Monday: DayDietSchema.optional(),
  Tuesday: DayDietSchema.optional(),
  Wednesday: DayDietSchema.optional(),
  Thursday: DayDietSchema.optional(),
  Friday: DayDietSchema.optional(),
  Saturday: DayDietSchema.optional(),
  Sunday: DayDietSchema.optional()
})

export const CreateDietSchema = z.object({
  clientId: z.string().trim().min(1, 'Cliente es requerido'),
  title: z.string().trim().min(1, 'Título es requerido').max(255, 'Título muy largo'),
  plan: PlanSchema.optional()
})

export const UpdateDietSchema = z.object({
  title: z.string().min(1, 'Título es requerido').max(255, 'Título muy largo').optional(),
  plan: PlanSchema.optional()
})

export type DayDiet = z.infer<typeof DayDietSchema>
export type Plan = z.infer<typeof PlanSchema>
export type CreateDietInput = z.infer<typeof CreateDietSchema>
export type UpdateDietInput = z.infer<typeof UpdateDietSchema>

export interface Diet {
  _id: string
  clientId: string
  title: string
  plan?: Plan
  createdAt: string
  updatedAt: string
}

export interface DietListItem {
  _id: string
  clientId: string
  title: string
  createdAt: string
  updatedAt: string
}
