import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  DollarSign,
  DoorOpen,
  Minus,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  PERIOD_OPTIONS,
  formatCurrency,
  type DashboardOverview,
} from './dashboardOverview'

type Tone = 'default' | 'warning' | 'danger'

const TONE_STYLES: Record<Tone, { card: string; icon: string }> = {
  default: { card: '', icon: 'bg-primary/10 text-primary' },
  warning: { card: 'border-amber-500/40', icon: 'bg-amber-500/10 text-amber-500' },
  danger: { card: 'border-red-500/40 bg-red-500/5', icon: 'bg-red-500/10 text-red-400' },
}

function ChangeBadge({ change, compareLabel }: { change: number | null; compareLabel: string }) {
  if (change === null) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3.5" />
        Sin datos para comparar
      </span>
    )
  }

  const positive = change >= 0
  const Icon = positive ? TrendingUp : TrendingDown

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <span
        className={cn(
          'flex items-center gap-1 font-semibold',
          positive ? 'text-emerald-500' : 'text-red-400'
        )}
      >
        <Icon className="size-3.5" />
        {Math.abs(change).toFixed(1)}%
      </span>
      {compareLabel}
    </span>
  )
}

interface KpiCardProps {
  title: string
  value: ReactNode
  icon: LucideIcon
  tone?: Tone
  footer?: ReactNode
  to?: string
  linkLabel?: string
}

function KpiCard({ title, value, icon: Icon, tone = 'default', footer, to, linkLabel }: KpiCardProps) {
  const styles = TONE_STYLES[tone]

  const content = (
    <Card className={cn('h-full transition-colors', styles.card, to && 'hover:border-primary/60')}>
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', styles.icon)}>
            <Icon className="size-5" />
          </span>
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <div className="mt-auto space-y-1 text-sm">{footer}</div>
        {to && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            {linkLabel}
            <ArrowRight className="size-3.5" />
          </span>
        )}
      </CardContent>
    </Card>
  )

  if (!to) return content

  return (
    <Link to={to} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  )
}

function SecondaryStat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <Icon className={cn('size-4 text-muted-foreground', tone === 'warning' && 'text-amber-500')} />
      <div>
        <p className="text-lg font-semibold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/** Indicadores que el dueño necesita de un vistazo: dinero, flujo de socios y cartera por renovar. */
export function OverviewKpis({ overview }: { overview: DashboardOverview }) {
  const option = PERIOD_OPTIONS.find((item) => item.value === overview.period) ?? PERIOD_OPTIONS[0]
  const { revenue, accesses, memberships } = overview

  return (
    <section aria-label="Indicadores principales" className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Ingresos · ${option.title}`}
          value={formatCurrency(revenue.total)}
          icon={DollarSign}
          footer={
            <>
              <ChangeBadge change={revenue.change} compareLabel={option.compareLabel} />
              <p className="text-xs text-muted-foreground">
                Membresías {formatCurrency(revenue.memberships)} · Productos {formatCurrency(revenue.products)}
              </p>
            </>
          }
        />

        <KpiCard
          title={`Accesos · ${option.title}`}
          value={accesses.count}
          icon={DoorOpen}
          footer={<ChangeBadge change={accesses.change} compareLabel={option.compareLabel} />}
        />

        <KpiCard
          title="Membresías activas"
          value={memberships.active}
          icon={CalendarCheck}
          tone={memberships.expiring > 0 ? 'warning' : 'default'}
          to="/clients?membership=valid"
          linkLabel="Ver socios vigentes"
          footer={
            <p className={cn('text-xs', memberships.expiring > 0 ? 'font-semibold text-amber-500' : 'text-muted-foreground')}>
              {memberships.expiring > 0
                ? `${memberships.expiring} vencen en los próximos 7 días`
                : 'Ninguna vence en los próximos 7 días'}
            </p>
          }
        />

        <KpiCard
          title="Membresías vencidas"
          value={memberships.expired}
          icon={AlertTriangle}
          tone={memberships.expired > 0 ? 'danger' : 'default'}
          to="/clients?membership=overdue"
          linkLabel="Ver y renovar"
          footer={
            <p className="text-xs text-muted-foreground">
              {memberships.expired > 0
                ? 'Socios que ya no pueden entrar: oportunidad de renovación'
                : 'Todos los socios están al corriente'}
            </p>
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SecondaryStat icon={UserPlus} label={`Membresías vendidas · ${option.title.toLowerCase()}`} value={memberships.sold} />
        <SecondaryStat icon={ShoppingCart} label={`Ventas de productos · ${option.title.toLowerCase()}`} value={overview.sales.count} />
        <SecondaryStat icon={Users} label="Clientes registrados" value={overview.clients.total} />
        <SecondaryStat
          icon={Package}
          label="Productos con bajo stock"
          value={overview.inventory.lowStockCount}
          tone={overview.inventory.lowStockCount > 0 ? 'warning' : undefined}
        />
      </div>
    </section>
  )
}
