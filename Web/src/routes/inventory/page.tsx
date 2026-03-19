import { PageHeader } from '@/components/global/PageHeader'
import { Button } from '@/components/ui/button'
import { NewProduct } from '@/components/Products/NewProduct'
import { EditProduct } from '@/components/Products/EditProduct'
import { ViewProduct } from '@/components/Products/ViewProduct'
import { API_ENDPOINTS } from '@/config/api'
import axios from 'axios'
import { Package, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'
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

interface ProductData {
  _id: string
  name: string
  description: string
  price: number
  stock: number
  category: string
  status: 'available' | 'unavailable' | 'discontinued'
  createdAt?: string
  updatedAt?: string
}

export default function Page() {
  const [products, setProducts] = useState<ProductData[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Modal states
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null)
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())

  const asyncLoad = useCallback(async () => {
    if (!activeStoreId) {
      setProducts([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCTS.GET_ALL(activeStoreId), {
        headers: {
          Authorization: useAuthStore.getState().token
        }
      })
      console.log("Productos cargados:", response.data)
      setProducts(response.data.products || [])
    } catch (error) {
      console.error("Error al cargar productos:", error)
      toast.error("Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }, [activeStoreId])

  useEffect(() => {
    asyncLoad()
  }, [asyncLoad]) // Recargar productos al cambiar de sede

  const handleDelete = async (productId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      return
    }

    if (!activeStoreId) {
      toast.error("No hay tienda activa seleccionada")
      return
    }

    try {
      await axios.delete(API_ENDPOINTS.PRODUCTS.DELETE(activeStoreId, productId), {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount)
  }

  const statusLabels: Record<string, string> = {
    available: "Disponible",
    unavailable: "No disponible",
    discontinued: "Discontinuado",
  }

  const statusColors: Record<string, string> = {
    available: "bg-green-100 text-green-700 border-green-200",
    unavailable: "bg-orange-100 text-orange-700 border-orange-200",
    discontinued: "bg-red-100 text-red-700 border-red-200",
  }

  const columns: ColumnDef<ProductData>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "description",
      header: "Descripción",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate">
          {row.getValue("description")}
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Precio",
      cell: ({ row }) => (
        <div className="font-semibold text-green-600">
          {formatCurrency(row.getValue("price"))}
        </div>
      ),
    },
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const stock = row.getValue("stock") as number
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{stock}</span>
            {stock === 0 && (
              <span className="text-xs text-red-500 font-medium">Sin stock</span>
            )}
            {stock > 0 && stock < 10 && (
              <span className="text-xs text-orange-500 font-medium">Bajo</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "category",
      header: "Categoría",
      cell: ({ row }) => (
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
          {row.getValue("category")}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-700"
              }`}
          >
            {statusLabels[status] || status}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const product = row.original

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
    data: products,
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
        description={`Administra el inventario de productos. Total: ${products.length}`}
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
                    Cargando productos...
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
                    No se encontraron productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

      {/* Modales */}
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
      />
    </div>
  )
}
