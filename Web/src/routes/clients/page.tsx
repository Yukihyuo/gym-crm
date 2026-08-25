import { PageHeader } from '@/components/global/PageHeader'
import { Button } from '@/components/ui/button'
import { API_ENDPOINTS } from '@/config/api'
import axios from 'axios'
import { User, MoreHorizontal, Trash2, Mail, Phone, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
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
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { useAuthStore } from "@/store/authStore"
import NewClientModal from '@/components/Clients/NewClientModal'
import DetailsClientModal from '@/components/Clients/DetailsClientModal'
import RegisterFingerprintModal from '@/components/Clients/RegisterFingerprintModal'
import ViewClientDiets from '@/components/diets/ViewClientDiets'
import ProtectedModule from '@/components/global/ProtectedModule'



interface Profile {
  names: string
  lastNames: string
  phone?: string
}

interface Assignment {
  id?: string
  roleName: string
}

interface UserData {
  _id: string
  username: string
  email: string
  profile: Profile
  fingerprint: string | null
  status: boolean
  assignments?: Assignment[]
  createdAt?: string
}

export default function Page() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const isMobile = useIsMobile()

  const brandId = useAuthStore((state) => state.getBrandId())

  const asyncLoad = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.CLIENTS.GET_BY_BRAND(brandId || ""))
      console.log("Clientes cargados:", response.data)
      setUsers(response.data.clients || [])
    } catch (error) {
      console.error("Error al cargar clientes:", error)
    } finally {
      setLoading(false)
    }
  }, [brandId])

  const handleDelete = async (clientId: string) => {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return

    try {
      await axios.delete(API_ENDPOINTS.CLIENTS.DELETE_BY_ID(clientId))
      toast.error("Cliente eliminado exitosamente")
      await asyncLoad()
    } catch (error) {
      console.error("Error al eliminar cliente:", error)
      toast.error("Error al eliminar cliente")
    }
  }

  useEffect(() => {
    asyncLoad()
  }, [asyncLoad])

  const columns: ColumnDef<UserData>[] = [
    {
      accessorKey: "username",
      header: "Usuario",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("username")}</div>
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
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="lowercase">{row.getValue("email")}</div>
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
      cell: ({ row }) => {
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
              <ProtectedModule page="Clients" type="read" method="hide">
                <DetailsClientModal clientId={row.original._id} onClientUpdated={asyncLoad} />
              </ProtectedModule>

              <ProtectedModule page="Clients" type="read" method="hide">
                <ViewClientDiets clientId={row.original._id} />
              </ProtectedModule>
              {
                row.original.fingerprint ? (null) : (
                  <ProtectedModule page="Clients" type="read" method="hide">
                    <RegisterFingerprintModal
                      clientId={row.original._id}
                      onRegistered={asyncLoad}
                    />
                  </ProtectedModule>
                )
              }

              <DropdownMenuSeparator />
              <ProtectedModule page="Clients" type="delete" method="hide">
                <div
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(row.original._id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </div>
              </ProtectedModule>
            </DropdownMenuContent>
          </DropdownMenu>
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
          { label: "Gestión de Clientes" }
        ]}
        title="Clientes"
        description={`Administra los clientes del sistema. Total: ${users.length}`}
        icon={<User className="h-5 w-5" />}
      />

      <div className="space-y-4">
        {/* Barra de búsqueda */}
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <ProtectedModule page="Clients" type="create" method="hide">
            <NewClientModal onSuccess={asyncLoad} />
          </ProtectedModule>
          <Input
            placeholder="Buscar clientes..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="w-full sm:max-w-sm"
          />
        </div>

        {/* Datos */}
        {isMobile ? (
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                Cargando usuarios...
              </div>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const actionsCell = row.getVisibleCells().find((cell) => cell.column.id === "actions")

                return (
                  <Card key={row.id} className="bg-card rounded-xl border border-border/60 shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback>
                          {row.original.profile.names?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-base text-card-foreground">
                          {row.original.profile.names} {row.original.profile.lastNames}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">@{row.original.username}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${row.original.status
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                            }`}
                        >
                          {row.original.status ? "Activo" : "Inactivo"}
                        </span>
                        {actionsCell ? flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext()) : null}
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-border/60 pt-3">
                      {row.original.email ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="break-all">{row.original.email}</span>
                        </div>
                      ) : null}
                      {row.original.profile.phone ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>{row.original.profile.phone}</span>
                        </div>
                      ) : null}
                      {row.original.assignments?.length ? (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {row.original.assignments.map((assignment) => (
                              <span
                                key={assignment.id || assignment.roleName}
                                className="inline-flex items-center rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                              >
                                {assignment.roleName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </Card>
                )
              })
            ) : (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                No se encontraron usuarios.
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
        )}

        {/* Paginación */}
        <div className="flex flex-col gap-2 px-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} usuario(s) en total
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
