import { PageHeader } from '@/components/global/PageHeader'
import { Button } from '@/components/ui/button'
import { RowActionsButton } from "@/components/ui/row-actions-button"
import { NewProduct } from '@/components/Products/NewProduct'
import { EditProduct } from '@/components/Products/EditProduct'
import { ViewProduct } from '@/components/Products/ViewProduct'
import { API_ENDPOINTS } from '@/config/api'
import axios from 'axios'
import { Package, Eye, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/ui/data-table'
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

interface Data {
  _id: string
}

export default function Page() {
  const [data, setData] = useState<Data[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Modal states
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Data | null>(null)

  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())
  const brandId = useAuthStore((state) => state.getBrandId())

  const asyncLoad = useCallback(async () => {
    if (!activeStoreId) {
      setData([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await axios.get("ENDPOINT HERE", {
        headers: {
          Authorization: useAuthStore.getState().token
        }
      })
      console.log("data load:", response.data)
      setData(response.data.products || [])
    } catch (error) {
      console.error("Error al cargar data:", error)
      toast.error("Error al cargar data")
    } finally {
      setLoading(false)
    }
  }, [activeStoreId])

  useEffect(() => {
    asyncLoad()
  }, [asyncLoad]) // Recargar productos al cambiar de sede

  const handleDelete = async (itemId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      return
    }

    if (!activeStoreId) {
      toast.error("No hay tienda activa seleccionada")
      return
    }

    try {
      await axios.delete("ENDPOINT DELETE HERE", {
        headers: {
          Authorization: useAuthStore.getState().token
        }
      })
      toast.success("Producto eliminado exitosamente")
      asyncLoad()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al eliminar producto:", error)
      toast.error(error.response?.data?.message || "Error al eliminar producto")
    }
  }

  const columns: ColumnDef<Data>[] = [
    {
      accessorKey: "_id",
      header: "_id",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("_id")}</div>
      ),
    },

    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const product = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <RowActionsButton />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedProduct(product)
                  setViewOpen(true)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedProduct(product)
                  setEditOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleDelete(product._id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
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
          { label: "Inventario" }
        ]}
        title="Productos"
        description={`Administra el inventario de productos. Total: ${data.length}`}
        icon={<Package className="h-5 w-5" />}
      />

      <div className="space-y-4">
        {/* Barra de búsqueda y botón crear */}
        <div className="flex items-center justify-between gap-2">
          <NewProduct onProductCreated={asyncLoad} />
          <Input
            placeholder="Buscar productos..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-sm"
          />
        </div>

        {/* Tabla */}
        <DataTable table={table} loading={loading} loadingText="Cargando productos..." emptyText="No se encontraron productos." />

        {/* Paginación */}
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} producto(s) en total
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
