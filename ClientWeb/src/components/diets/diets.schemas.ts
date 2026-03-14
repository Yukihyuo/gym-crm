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

export type DietDay = typeof DIET_DAYS[number]
export type DietMeal = typeof DIET_MEALS[number]

export type DayDiet = {
  breakfast?: string | null
  brunch?: string | null
  lunch?: string | null
  snack?: string | null
  dinner?: string | null
}

export type Plan = {
  [K in DietDay]?: DayDiet
}

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
