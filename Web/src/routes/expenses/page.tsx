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
import { HandCoins } from 'lucide-react'
import { toast } from 'react-toastify'
import { PageHeader } from '@/components/global/PageHeader'
import ProtectedModule from '@/components/global/ProtectedModule'
import NewExpenseModal from '@/components/Expenses/newExpenseModal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { API_ENDPOINTS } from '@/config/api'
import apiClient from '@/lib/axios'
import {
	getExpenseCategoryLabel,
	getExpenseSourceLabel,
} from '@/lib/expenses'
import { useAuthStore } from '@/store/authStore'

interface ExpenseUser {
	_id?: string
	username?: string
	email?: string
	profile?: {
		names?: string
		lastNames?: string
	}
}

interface ExpenseStore {
	_id?: string
	name?: string
}

interface ExpenseData {
	_id: string
	amount: number
	category: string
	description?: string
	source: string
	date?: string
	createdAt?: string
	userId?: ExpenseUser | string
	storeId?: ExpenseStore | string
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

	return date.toLocaleDateString('es-MX', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
	})
}

const getUserLabel = (value?: ExpenseUser | string) => {
	if (!value) return '-'
	if (typeof value === 'string') return value

	const fullName = `${value.profile?.names || ''} ${value.profile?.lastNames || ''}`.trim()
	return fullName || value.username || value.email || '-'
}

export default function Page() {
	const [expenses, setExpenses] = useState<ExpenseData[]>([])
	const [loading, setLoading] = useState(true)
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = useState('')
	const activeStore = useAuthStore((state) => state.getActiveStore())
	const activeStoreId = useAuthStore((state) => state.getActiveStoreId())

	const asyncLoad = useCallback(async () => {
		if (!activeStoreId) {
			setExpenses([])
			setLoading(false)
			return
		}

		setLoading(true)
		try {
			const response = await apiClient.get(API_ENDPOINTS.EXPENSES.GET_ALL)
			setExpenses(response.data?.expenses || [])
		} catch (error) {
			console.error('Error al cargar gastos:', error)
			toast.error('Error al cargar gastos')
			setExpenses([])
		} finally {
			setLoading(false)
		}
	}, [activeStoreId])

	useEffect(() => {
		asyncLoad()
	}, [asyncLoad])

	const columns = useMemo<ColumnDef<ExpenseData>[]>(
		() => [
			{
				accessorKey: 'index',
				header: '#',
				cell: (info) => info.row.index + 1,
				enableSorting: false,
			},
			{
				id: 'date',
				header: 'Fecha',
				accessorFn: (row) => row.date || row.createdAt || '',
				cell: ({ row }) => <div>{formatDate(row.original.date || row.original.createdAt)}</div>,
			},
			{
				id: 'category',
				header: 'Categoría',
				accessorFn: (row) => getExpenseCategoryLabel(row.category),
				cell: ({ row }) => <div className="font-medium">{getExpenseCategoryLabel(row.original.category)}</div>,
			},
			{
				id: 'source',
				header: 'Origen',
				accessorFn: (row) => getExpenseSourceLabel(row.source),
				cell: ({ row }) => <div>{getExpenseSourceLabel(row.original.source)}</div>,
			},
			{
				id: 'amount',
				header: 'Monto',
				accessorFn: (row) => row.amount,
				cell: ({ row }) => <div>{formatCurrency(row.original.amount)}</div>,
			},
			{
				id: 'description',
				header: 'Descripción',
				accessorFn: (row) => row.description || '',
				cell: ({ row }) => (
					<div className="max-w-xs truncate text-sm text-muted-foreground">
						{row.original.description || 'Sin descripción'}
					</div>
				),
			},
			{
				id: 'user',
				header: 'Registrado por',
				accessorFn: (row) => getUserLabel(row.userId),
				cell: ({ row }) => <div>{getUserLabel(row.original.userId)}</div>,
			},
		],
		[]
	)

	const table = useReactTable({
		data: expenses,
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
					{ label: 'Gastos' },
				]}
				title="Gastos"
				description={`Tienda activa: ${activeStoreLabel}. Total: ${expenses.length}`}
				icon={<HandCoins className="h-5 w-5" />}
			/>

			<div className="space-y-4">
				<div className="flex items-center justify-between gap-2">
					<ProtectedModule page="Expenses" type="create" method="hide">
						<NewExpenseModal onSuccess={asyncLoad} />
					</ProtectedModule>
					<Input
						placeholder="Buscar gastos..."
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
										Cargando gastos...
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
										No se encontraron gastos para esta tienda.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<div className="flex items-center justify-between px-2">
					<div className="text-sm text-muted-foreground">
						{table.getFilteredRowModel().rows.length} gasto(s) en total
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
