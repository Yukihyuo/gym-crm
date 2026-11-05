export type DashboardPeriod = 'today' | 'week' | 'month'

export const PERIOD_OPTIONS: { value: DashboardPeriod; label: string; compareLabel: string; title: string }[] = [
  { value: 'today', label: 'Hoy', compareLabel: 'vs ayer', title: 'Hoy' },
  { value: 'week', label: '7 días', compareLabel: 'vs 7 días previos', title: 'Últimos 7 días' },
  { value: 'month', label: 'Mes', compareLabel: 'vs mes anterior', title: 'Este mes' },
]

export const ALL_STORES = 'all'

export interface DashboardOverview {
  period: DashboardPeriod
  revenue: {
    total: number
    products: number
    memberships: number
    previousTotal: number
    change: number | null
  }
  sales: { count: number; change: number | null }
  accesses: { count: number; change: number | null }
  memberships: {
    sold: number
    change: number | null
    active: number
    expiring: number
    expired: number
  }
  clients: { total: number }
  inventory: { lowStockCount: number }
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
