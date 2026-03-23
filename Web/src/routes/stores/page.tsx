import { PageHeader } from '@/components/global/PageHeader'
import { Button } from '@/components/ui/button'
import CreateStoreModal from '@/components/stores/CreateStoreModal'
import DetailsStoreModal from '@/components/stores/DetailsStoreModal'
import { API_ENDPOINTS } from '@/config/api'
import axios from 'axios'
import { Package, MoreHorizontal, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'react-toastify'
import { useAuthStore } from '@/store/authStore'
import ProtectedModule from '@/components/global/ProtectedModule'
import apiClient from '@/lib/axios'

interface Data {
  _id: string
}

export default function Page() {
  const [data, setData] = useState<Data[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const asyncLoad = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.get("v1/stores/getAll")
      console.log("stores load:", response.data)
      setData(response.data.stores || [])
    } catch (error) {
      console.error("Error al cargar stores:", error)
      toast.error("Error al cargar tiendas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    asyncLoad()
  }, [asyncLoad]) // Recargar productos al cambiar de sede

  const handleDelete = async (itemId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta tienda?")) {
      return
    }

    try {
      await axios.delete(API_ENDPOINTS.STORES.DELETE(itemId), {
        headers: {
          Authorization: useAuthStore.getState().token
        }
      })
      toast.success("Tienda eliminada exitosamente")
      asyncLoad()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al eliminar tienda:", error)
      toast.error(error.response?.data?.message || "Error al eliminar tienda")
    }
  }

  const columns: ColumnDef<Data>[] = [
    {
      accessorKey: "index",
      header: "#",
      cell: (info) => info.row.index + 1,
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },

    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const store = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ProtectedModule page="Stores" type="read" method="hide">
                <DetailsStoreModal storeId={store._id} onStoreUpdated={asyncLoad} />
              </ProtectedModule>
              <DropdownMenuSeparator />
              <ProtectedModule page="Stores" type="delete" method="hide">
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => handleDelete(store._id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </ProtectedModule>

            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: data,
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
          { label: "Admin", href: "/admin" },
          { label: "Tiendas" }
        ]}
        title="Tiendas"
        description={`Administra las tiendas. Total: ${data.length}`}
        icon={<Package className="h-5 w-5" />}
      />

      <div className="space-y-4">
        {/* Barra de búsqueda y botón crear */}
        <div className="flex items-center justify-between gap-2">
          <ProtectedModule page="Stores" type="create" method="hide">
            <CreateStoreModal onStoreCreated={asyncLoad} />
          </ProtectedModule>
          <Input
            placeholder="Buscar tiendas..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-sm"
          />
        </div>

        {/* Tabla */}
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
                    Cargando tiendas...
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
                    No se encontraron tiendas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} tienda(s) en total
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
              Página {table.getState().pagination.pageIndex + 1} de{" "}
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

      {/* Modales
      <ViewProduct
        open={viewOpen}
        onOpenChange={setViewOpen}
        product={selectedProduct}
      />
      <EditProduct
        open={editOpen}
        onOpenChange={setEditOpen}
        product={selectedProduct}
        onProductUpdated={asyncLoad}
      /> */}
    </div>
  )
}
