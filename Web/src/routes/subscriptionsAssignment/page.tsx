import { PageHeader } from '@/components/global/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import NewSubscriptionsAssignment from '@/components/subscriptionsAssignment/NewSubscriptionsAssignment'
import DetailsSubscriptionsAssignment from '@/components/subscriptionsAssignment/DetailsSubscriptionsAssignment'
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
import { CalendarCheck2, MoreHorizontal, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

interface SubscriptionAssignmentData {
  _id: string
  brandId: string
  storeId: string | { _id: string; name?: string }
  clientId: string | { _id: string; profile?: { names?: string; lastNames?: string }; email?: string }
  planId: string | { _id: string; name?: string }
  startDate?: string
  endDate?: string
  pricePaid: number | { amount?: number }
  status: 'active' | 'expired' | 'cancelled'
  createdAt?: string
  updatedAt?: string
}

const formatDate = (value?: string) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('es-MX')
}

const resolvePrice = (pricePaid: SubscriptionAssignmentData['pricePaid']) => {
  if (typeof pricePaid === 'number') return pricePaid
  return Number(pricePaid?.amount || 0)
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(value)

const getClientDisplay = (client: SubscriptionAssignmentData['clientId']) => {
  if (!client) return 'N/A'
  if (typeof client === 'string') return client
  const fullName = `${client.profile?.names || ''} ${client.profile?.lastNames || ''}`.trim()
  return fullName || client.email || client._id || 'N/A'
}

const getPlanDisplay = (plan: SubscriptionAssignmentData['planId']) => {
  if (!plan) return 'N/A'
  if (typeof plan === 'string') return plan
  return plan.name || plan._id || 'N/A'
}

const getStoreDisplay = (store: SubscriptionAssignmentData['storeId']) => {
  if (!store) return 'N/A'
  if (typeof store === 'string') return store
  return store.name || store._id || 'N/A'
}

export default function Page() {
  const [assignments, setAssignments] = useState<SubscriptionAssignmentData[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const brandId = useAuthStore((state) => state.getBrandId())
  const token = useAuthStore((state) => state.token)

  const asyncLoad = useCallback(async () => {
    if (!brandId) {
      setAssignments([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.SUBSCRIPTIONS_ASSIGNMENTS.GET_BY_BRAND(brandId))
      setAssignments(response.data.assignments || [])
    } catch (error) {
      console.error('Error al cargar asignaciones de membresía:', error)
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    asyncLoad()
  }, [asyncLoad])

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta suscripción de usuario?')) {
      return
    }

    try {
      const response = await axios.delete(API_ENDPOINTS.SUBSCRIPTIONS_ASSIGNMENTS.DELETE(assignmentId), {
        headers: {
          Authorization: token,
        },
      })

      toast.success(response.data?.message || 'Asignación cancelada exitosamente')
      asyncLoad()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error al cancelar asignación:', error)
      toast.error(error.response?.data?.message || 'Error al cancelar asignación')
    }
  }

  const columns: ColumnDef<SubscriptionAssignmentData>[] = [
    {
      accessorKey: 'clientId',
      header: 'Cliente',
      accessorFn: (row) => getClientDisplay(row.clientId),
      cell: ({ row }) => <div className="font-medium">{getClientDisplay(row.original.clientId)}</div>,
    },
    {
      accessorKey: 'planId',
      header: 'Membresía',
      accessorFn: (row) => getPlanDisplay(row.planId),
      cell: ({ row }) => <div>{getPlanDisplay(row.original.planId)}</div>,
    },
    {
      accessorKey: 'storeId',
      header: 'Sucursal',
      accessorFn: (row) => getStoreDisplay(row.storeId),
      cell: ({ row }) => <div>{getStoreDisplay(row.original.storeId)}</div>,
    },
    {
      id: 'startDate',
      header: 'Inicio',
      accessorFn: (row) => row.startDate || '',
      cell: ({ row }) => <div>{formatDate(row.original.startDate)}</div>,
    },
    {
      id: 'endDate',
      header: 'Vencimiento',
      accessorFn: (row) => row.endDate || '',
      cell: ({ row }) => <div>{formatDate(row.original.endDate)}</div>,
    },
    {
      id: 'pricePaid',
      header: 'Monto pagado',
      accessorFn: (row) => resolvePrice(row.pricePaid),
      cell: ({ row }) => <div>{formatCurrency(resolvePrice(row.original.pricePaid))}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const value = row.getValue('status') as SubscriptionAssignmentData['status']
        const badgeClass =
          value === 'active'
            ? 'bg-green-100 text-green-700'
            : value === 'expired'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'

        const label = value === 'active' ? 'Activa' : value === 'expired' ? 'Expirada' : 'Cancelada'

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
        const assignment = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Detalle</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DetailsSubscriptionsAssignment
                assignmentId={assignment._id}
                onAssignmentUpdated={asyncLoad}
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleDeleteAssignment(assignment._id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar suscripción
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  const table = useReactTable({
    data: assignments,
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
          { label: 'Asignación de Membresías' }
        ]}
        title="Asignación de Membresías"
        description={`Visualiza las asignaciones de membresía de tu marca. Total: ${assignments.length}`}
        icon={<CalendarCheck2 className="h-5 w-5" />}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <NewSubscriptionsAssignment onAssignmentCreated={asyncLoad} />
          <Input
            placeholder="Buscar asignaciones..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-sm"
          />
        </div>

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
                    Cargando asignaciones...
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
                    No se encontraron asignaciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} asignación(es) en total
          </div>
          <div className="flex items-center space-x-2">
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