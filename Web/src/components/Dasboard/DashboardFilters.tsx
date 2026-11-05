import { Store } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ALL_STORES, PERIOD_OPTIONS, type DashboardPeriod } from './dashboardOverview'

interface DashboardFiltersProps {
  period: DashboardPeriod
  onPeriodChange: (period: DashboardPeriod) => void
  storeId: string
  onStoreChange: (storeId: string) => void
  stores: { id: string; name: string }[]
}

/** Selector de periodo y sede que gobierna todos los indicadores del dashboard. */
export function DashboardFilters({
  period,
  onPeriodChange,
  storeId,
  onStoreChange,
  stores,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {stores.length > 1 && (
        <Select value={storeId} onValueChange={onStoreChange}>
          <SelectTrigger className="h-10 w-[200px]" aria-label="Sede">
            <Store className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STORES}>Todas las sedes</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div role="group" aria-label="Periodo" className="inline-flex rounded-lg border bg-card p-1">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={period === option.value ? 'default' : 'ghost'}
            aria-pressed={period === option.value}
            onClick={() => onPeriodChange(option.value)}
            className={cn('h-8 px-4', period !== option.value && 'text-muted-foreground')}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
