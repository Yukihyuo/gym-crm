import { PageHeader } from '@/components/global/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import NewSubscriptionModal from '@/components/subscriptions/NewSubscriptionModal'
import DetailsSubscriptionModal from '@/components/subscriptions/DetailsSubscriptionModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { API_ENDPOINTS } from '@/config/api'
import { useAuthStore } from '@/store/authStore'
import { useIsMobile } from '@/hooks/use-mobile'
import { Card } from '@/components/ui/card'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import axios from 'axios'
import { CalendarClock, Check, CreditCard, MoreHorizontal, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import ProtectedModule from '@/components/global/ProtectedModule'

interface Duration {
  value: number
  unit: 'days' | 'weeks' | 'months' | 'years'
}

interface Price {
  amount: number
  currency: string
}

interface Benefit {
  name?: string
  included?: boolean
  limit?: number
}

interface SubscriptionData {
  _id: string
  brandId: string
  name: string
  description?: string
  duration: Duration
  price: Price
  benefits: Benefit[]
  status: 'active' | 'inactive' | 'archived'
  createdAt?: string
  updatedAt?: string
}

const formatDuration = (duration: Duration) => {
  const labels: Record<Duration['unit'], string> = {
    days: 'día(s)',
    weeks: 'semana(s)',
    months: 'mes(es)',
    years: 'año(s)'
  }

  return `${duration.value} ${labels[duration.unit]}`
}

const formatCurrency = (price: Price) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: price.currency || 'MXN'
  }).format(price.amount)

export default function Page() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const isMobile = useIsMobile()

  const brandId = useAuthStore((state) => state.getBrandId())
  const token = useAuthStore((state) => state.token)

  const asyncLoad = useCallback(async () => {
    if (!brandId) {
      setSubscriptions([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.SUBSCRIPTIONS.GET_BY_BRAND(brandId))
      setSubscriptions(response.data.subscriptions || [])
    } catch (error) {
      console.error('Error al cargar membresías:', error)
      setSubscriptions([])
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    asyncLoad()
  }, [asyncLoad])

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta suscripción?')) {
      return
    }

    try {
      const response = await axios.delete(API_ENDPOINTS.SUBSCRIPTIONS.DELETE(subscriptionId), {
        headers: {
          Authorization: token,
        },
      })

      toast.success(response.data?.message || 'Suscripción eliminada exitosamente')
      asyncLoad()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error al eliminar suscripción:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar suscripción')
    }
  }

  const columns: ColumnDef<SubscriptionData>[] = [
    {
      accessorKey: 'name',
      header: 'Membresía',
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
      cell: ({ row }) => (
        <div className="max-w-65 truncate">
          {row.original.description || 'Sin descripción'}
        </div>
      ),
    },
    {
      id: 'duration',
      header: 'Duración',
      accessorFn: (row) => formatDuration(row.duration),
      cell: ({ row }) => <div>{formatDuration(row.original.duration)}</div>,
    },
    {
      id: 'price',
      header: 'Precio',
      accessorFn: (row) => row.price.amount,
      cell: ({ row }) => <div>{formatCurrency(row.original.price)}</div>,
    },
    {
      id: 'benefitsCount',
      header: 'Beneficios',
      accessorFn: (row) => row.benefits?.length || 0,
      cell: ({ row }) => <div>{row.original.benefits?.length || 0}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const value = row.getValue('status') as SubscriptionData['status']
        const badgeClass =
          value === 'active'
            ? 'bg-green-100 text-green-700'
            : value === 'inactive'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'

        const label = value === 'active' ? 'Activa' : value === 'inactive' ? 'Inactiva' : 'Archivada'

        return (
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${badgeClass}`}>
            {label}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const subscription = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Detalles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ProtectedModule page="Subscriptions" type="read" method="hide">
                <DetailsSubscriptionModal
                  subscriptionId={subscription._id}
                  onSubscriptionUpdated={asyncLoad}
                />
              </ProtectedModule>
              <DropdownMenuSeparator />
         <ProtectedModule page="Subscriptions" type="delete" method="hide">
               <DropdownMenuItem
                 className="text-red-600"
                 onClick={() => handleDeleteSubscription(subscription._id)}
               >
                 <Trash2 className="mr-2 h-4 w-4" />
                 Eliminar suscripción
               </DropdownMenuItem>
         </ProtectedModule>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  const table = useReactTable({
    data: subscriptions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Membresías' }
        ]}
        title="Membresías"
        description={`Administra las membresías de tu marca. Total: ${subscriptions.length}`}
        icon={<CreditCard className="h-5 w-5" />}
      />

      <div className="space-y-4">
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <ProtectedModule page="Subscriptions" type="create" method="hide">
            <NewSubscriptionModal onSubscriptionCreated={asyncLoad} />
          </ProtectedModule>
          <Input
            placeholder="Buscar membresías..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="w-full sm:max-w-sm"
          />
        </div>

        {isMobile ? (
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
                Cargando membresías...
              </div>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const subscription = row.original
                const actionsCell = row.getVisibleCells().find((cell) => cell.column.id === 'actions')
                const statusClass = subscription.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : subscription.status === 'inactive'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                const statusLabel = subscription.status === 'active'
                  ? 'Activa'
                  : subscription.status === 'inactive'
                    ? 'Inactiva'
                    : 'Archivada'
                const namedBenefits = (subscription.benefits || [])
                  .filter((benefit) => benefit.name)
                  .slice(0, 3)

                return (
                  <Card
                    key={row.id}
                    className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-card-foreground">
                          {subscription.name}
                        </h3>
                        {subscription.description ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {subscription.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${statusClass}`}>
                          {statusLabel}
                        </span>
                        {actionsCell ? flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext()) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Precio</p>
                        <p className="mt-1 text-lg font-semibold text-card-foreground">{formatCurrency(subscription.price)}</p>
                      </div>
                      <div className="border-l border-border/60 pl-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Duración</p>
                        <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-card-foreground">
                          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDuration(subscription.duration)}
                        </div>
                      </div>
                    </div>

                    {namedBenefits.length ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Beneficios incluidos</span>
                          <span className="text-[11px] text-muted-foreground">{subscription.benefits?.length || 0} total</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {namedBenefits.map((benefit, index) => (
                            <span
                              key={`${benefit.name}-${index}`}
                              className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              <Check className="h-3 w-3 shrink-0" />
                              <span className="truncate">{benefit.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </Card>
                )
              })
            ) : (
              <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
                No se encontraron membresías.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b bg-muted/50">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center">
                      Cargando membresías...
                    </td>
                  </tr>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-4 align-middle">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center">
                      No se encontraron membresías.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-2 px-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} membresía(s) en total
          </div>
          <div className="flex items-center justify-between gap-2 sm:space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <div className="text-sm font-medium">
              Página {table.getState().pagination.pageIndex + 1} de{' '}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}