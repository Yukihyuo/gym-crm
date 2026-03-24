export const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'salary', label: 'Sueldos y salarios' },
  { value: 'payroll_taxes', label: 'Cargas sociales e impuestos de nómina' },
  { value: 'rent', label: 'Renta' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'cleaning', label: 'Limpieza' },
  { value: 'supplies', label: 'Insumos y papelería' },
  { value: 'inventory', label: 'Inventario o mercancía' },
  { value: 'equipment', label: 'Equipamiento y mobiliario' },
  { value: 'maintenance', label: 'Mantenimiento y reparaciones' },
  { value: 'marketing', label: 'Marketing y publicidad' },
  { value: 'software', label: 'Software y suscripciones' },
  { value: 'professional_fees', label: 'Honorarios profesionales' },
  { value: 'insurance', label: 'Seguros' },
  { value: 'taxes', label: 'Impuestos y permisos' },
  { value: 'bank_fees', label: 'Comisiones y cargos bancarios' },
  { value: 'transport', label: 'Transporte y viáticos' },
  { value: 'training', label: 'Capacitación' },
  { value: 'withdrawal', label: 'Retiro de efectivo' },
  { value: 'other', label: 'Otros' },
] as const

export const EXPENSE_SOURCE_OPTIONS = [
  { value: 'cash_drawer', label: 'Caja física' },
  { value: 'bank_account', label: 'Cuenta bancaria' },
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORY_OPTIONS)[number]['value']
export type ExpenseSource = (typeof EXPENSE_SOURCE_OPTIONS)[number]['value']

const EXPENSE_CATEGORY_LABELS = Object.fromEntries(
  EXPENSE_CATEGORY_OPTIONS.map((option) => [option.value, option.label])
) as Record<ExpenseCategory, string>

const EXPENSE_SOURCE_LABELS = Object.fromEntries(
  EXPENSE_SOURCE_OPTIONS.map((option) => [option.value, option.label])
) as Record<ExpenseSource, string>

export const getExpenseCategoryLabel = (value?: string | null) => {
  if (!value) return 'Sin categoría'
  return EXPENSE_CATEGORY_LABELS[value as ExpenseCategory] ?? value
}

export const getExpenseSourceLabel = (value?: string | null) => {
  if (!value) return 'Sin fuente'
  return EXPENSE_SOURCE_LABELS[value as ExpenseSource] ?? value
}
