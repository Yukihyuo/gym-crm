import { NewPageModal } from '@/components/pages/NewPageModal'
import { EditPageModal } from '@/components/pages/EditPageModal'
import { PageHeader } from '@/components/global/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { API_ENDPOINTS } from '@/config/api'
import axios from 'axios'
import { FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'react-toastify'
import ProtectedModule from '@/components/global/ProtectedModule'

interface Module {
  _id: string
  pageId: string
  type: "read" | "create" | "delete" | "update"
}

interface PageData {
  _id: string
  name: string
  path: string
  modules: string[]
  moduleDetails: Module[]
}

export default function Page() {
  const [pages, setPages] = useState<PageData[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const asyncLoad = async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.PAGES.GET_ALL)
      console.log("Páginas cargadas:", response.data)
      setPages(response.data.pages || [])
    } catch (error) {
      console.error("Error al cargar páginas:", error)
      toast.error("Error al cargar páginas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    asyncLoad()
  }, [])

  const handleDelete = async (pageId: string, pageName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la página "${pageName}"? Esto también eliminará todos sus módulos.`)) {
      return
    }

    try {
      await axios.delete(API_ENDPOINTS.PAGES.DELETE(pageId))
      toast.success("Página eliminada exitosamente")
      await asyncLoad()
    } catch (error) {
      console.error("Error al eliminar página:", error)
      toast.error("Error al eliminar página")
    }
  }

  const getModuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      read: "Lectura",
      create: "Escritura",
      update: "Actualización",
      delete: "Eliminación"
    }
    return labels[type] || type
  }

  const columns: ColumnDef<PageData>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "path",
      header: "Ruta",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("path")}</div>
      ),
    },
    {
      id: "modules",
      header: "Módulos",
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.moduleDetails.length === 0 ? (
            <span className="text-muted-foreground text-sm">Sin módulos</span>
          ) : (
            row.original.moduleDetails.map((module) => (
              <span
                key={module._id}
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
              >
                {getModuleTypeLabel(module.type)}
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      id: "moduleCount",
      header: "Total Módulos",
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary w-8 h-8 text-sm font-medium">
            {row.original.moduleDetails.length}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const page = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ProtectedModule page="Pages" type="read" method="hide">
                <EditPageModal
                  page={page}
                  onSuccess={asyncLoad}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  }
                />
              </ProtectedModule>
              <ProtectedModule page="Pages" type="delete" method="hide">
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => handleDelete(page._id, page.name)}
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
    data: pages,
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
          { label: "Gestión de Páginas" }
        ]}
        title="Páginas"
        description={`Administra las páginas y sus módulos del sistema. Total: ${pages.length}`}
        icon={<FileText className="h-5 w-5" />}
        actions={
          <ProtectedModule page="Pages" type="create" method="hide">
            <NewPageModal onSuccess={asyncLoad} />
          </ProtectedModule>
        }
      />

      <div className="space-y-4">
        {/* Barra de búsqueda */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar páginas..."
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
                    Cargando páginas...
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
                    No se encontraron páginas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} página(s) en total
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
    </div>
  )
}
