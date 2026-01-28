import { PageHeader } from '@/components/global/PageHeader'
import { Button } from '@/components/ui/button'
import { NewUserModal } from '@/components/users/NewUserModal'
import { API_ENDPOINTS } from '@/config/api'
import axios from 'axios'
import { User, MoreHorizontal } from 'lucide-react'
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
import { Input } from '@/components/ui/input'

interface Role {
  id: string
  name: string
}

interface Profile {
  names: string
  lastNames: string
  phone?: string
}

interface UserData {
  _id: string
  username: string
  email: string
  profile: Profile
  status: boolean
  roles: Role[]
  createdAt?: string
  updatedAt?: string
}

export default function Page() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const asyncLoad = async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.USERS.GET_ALL_USERS)
      console.log("Usuarios cargados:", response.data)
      setUsers(response.data.users || [])
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    asyncLoad()
  }, [])

  const columns: ColumnDef<UserData>[] = [
    {
      accessorKey: "username",
      header: "Usuario",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("username")}</div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="lowercase">{row.getValue("email")}</div>
      ),
    },
    {
      id: "fullName",
      header: "Nombre Completo",
      accessorFn: (row) => `${row.profile.names} ${row.profile.lastNames}`,
      cell: ({ row }) => (
        <div>{row.original.profile.names} {row.original.profile.lastNames}</div>
      ),
    },
    {
      accessorKey: "profile.phone",
      header: "Teléfono",
      cell: ({ row }) => (
        <div>{row.original.profile.phone || "N/A"}</div>
      ),
    },
    {
      id: "roles",
      header: "Roles",
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.roles.map((role) => (
            <span
              key={role.id}
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
            >
              {role.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <div className="flex items-center">
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${row.getValue("status")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
              }`}
          >
            {row.getValue("status") ? "Activo" : "Inactivo"}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cell: ({ row }) => {
        // TODO: Agregar acciones específicas aquí
        return (
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )
      },
    },
  ]

  const table = useReactTable({
    data: users,
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
          { label: "Gestión de Usuarios" }
        ]}
        title="Usuarios"
        description={`Administra los usuarios del sistema. Total: ${users.length}`}
        icon={<User className="h-5 w-5" />}
      />

      <div className="space-y-4">
        {/* Barra de búsqueda */}
        <div className="flex items-center justify-between gap-2">
          <NewUserModal onSuccess={asyncLoad} />
          <Input
            placeholder="Buscar usuarios..."
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
                    Cargando usuarios...
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
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} usuario(s) en total
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
