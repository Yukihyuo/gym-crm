import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Wallet, MoreHorizontal } from 'lucide-react'
import { toast } from 'react-toastify'
import { PageHeader } from '@/components/global/PageHeader'
import CashCutModal from '@/components/CashCut/CashCutModal'
import DetailsCashCutModal from '@/components/CashCut/detailsCashCutModal'
import ProtectedModule from '@/components/global/ProtectedModule'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { API_ENDPOINTS } from '@/config/api'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'

type CashCutStatus = 'balanced' | 'shortage' | 'surplus' | 'pending' | 'incomplete'

interface CashCutData {
  _id: string
  staffId: {
    email: string
    username: string
  }
  brandId: string
  storeId: string
  openingDate: string
  closingDate?: string | null
  initialCash: number
  cashDifference: number
  status: CashCutStatus
  systemTotals?: {
    grandTotal?: number
    byMethod?: {
      cash?: number
      transfer?: number
      card?: number
    }
  }
  reportedTotals?: {
    cashInHand?: number
  }
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value ?? 0))

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusLabel = (status: CashCutStatus) => {
  if (status === 'pending') return 'Pendiente'
  if (status === 'incomplete') return 'Incompleto'
  if (status === 'balanced') return 'Cuadrado'
  if (status === 'shortage') return 'Faltante'
  if (status === 'surplus') return 'Sobrante'
  return status
}

const getStatusClass = (status: CashCutStatus) => {
  if (status === 'balanced') return 'bg-green-100 text-green-700'
  if (status === 'shortage') return 'bg-red-100 text-red-700'
  if (status === 'surplus') return 'bg-blue-100 text-blue-700'
  if (status === 'incomplete') return 'bg-yellow-100 text-yellow-700'
  return 'bg-muted text-muted-foreground'
}

export default function Page() {
  const [cashCuts, setCashCuts] = useState<CashCutData[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const activeStore = useAuthStore((state) => state.getActiveStore())

  const asyncLoad = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.get(API_ENDPOINTS.CASH_CUTS.GET_ALL)
      console.log(response.data.cashCuts)
      setCashCuts(response.data?.cashCuts || [])
    } catch (error) {
      console.error('Error al cargar cortes de caja:', error)
      toast.error('Error al cargar cortes de caja')
      setCashCuts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    asyncLoad()
  }, [asyncLoad])

  const getReportedCashCell = (reportedTotals?: CashCutData['reportedTotals'], status?: CashCutStatus) => {
    if (status === 'pending' || status === 'incomplete') {
      return <div className="text-yellow-700">Pendiente de reporte</div>
    }
    if (reportedTotals?.cashInHand === undefined) {
      return <div className="text-muted-foreground">-</div>
    }
    return <div>{formatCurrency(reportedTotals.cashInHand)}</div>
  }


  const columns = useMemo<ColumnDef<CashCutData>[]>(
    () => [
      {
        accessorKey: 'index',
        header: '#',
        cell: (info) => info.row.index + 1,
        enableSorting: false,
      },
      {
        accessorKey: 'staffId',
        header: 'Usuario',
        cell: ({ row }) => <div className="font-medium">{row.original.staffId.username}</div>,
      },
      {
        id: 'openingDate',
        header: 'Apertura',
        accessorFn: (row) => row.openingDate,
        cell: ({ row }) => <div>{formatDate(row.original.openingDate)}</div>,
      },
      {
        id: 'closingDate',
        header: 'Cierre',
        accessorFn: (row) => row.closingDate || '',
        cell: ({ row }) => <div>{formatDate(row.original.closingDate)}</div>,
      },
      {
        id: 'initialCash',
        header: 'Fondo inicial',
        accessorFn: (row) => row.initialCash,
        cell: ({ row }) => <div>{formatCurrency(row.original.initialCash)}</div>,
      },
      // {
      //   id: 'systemTotal',
      //   header: 'Total sistema',
      //   accessorFn: (row) => row.systemTotals?.grandTotal || 0,
      //   cell: ({ row }) => <div>{formatCurrency(row.original.systemTotals?.grandTotal)}</div>,
      // },
      {
        id: 'cashInHand',
        header: 'Efectivo reportado',
        accessorFn: (row) => row.reportedTotals?.cashInHand || 0,
        cell: ({ row }) =>
          getReportedCashCell(row.original.reportedTotals, row.original.status),
      },
      {
        id: 'cashDifference',
        header: 'Diferencia',
        accessorFn: (row) => row.cashDifference,
        cell: ({ row }) => {
          const value = row.original.cashDifference
          const className =
            value === 0 ? 'text-green-700' : value < 0 ? 'text-red-700' : 'text-blue-700'

          return <div className={className}>{formatCurrency(value)}</div>
        },
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const status = row.original.status

          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(status)}`}
            >
              {getStatusLabel(status)}
            </span>
          )
        },
      },
      {
        accessorKey: 'actions',
        header: 'Acciones',
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <DetailsCashCutModal cashCutId={row.original._id} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: cashCuts,
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

  const activeStoreLabel = activeStore?.name || activeStore?._id || activeStore?.id || 'Sin tienda activa'

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Cortes de caja' },
        ]}
        title="Cortes de caja"
        description={`Tienda activa: ${activeStoreLabel}. Total: ${cashCuts.length}`}
        icon={<Wallet className="h-5 w-5" />}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <ProtectedModule page="CashCuts" type="create" method="hide">
            <CashCutModal />
          </ProtectedModule>
          <Input
            placeholder="Buscar cortes..."
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
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center">
                    Cargando cortes de caja...
                  </td>
                </tr>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center">
                    No se encontraron cortes de caja para esta tienda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} corte(s) en total
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
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
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