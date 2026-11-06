import { PageHeader } from '@/components/global/PageHeader'
import { Button } from '@/components/ui/button'
import { RowActionsButton } from "@/components/ui/row-actions-button"
import { API_ENDPOINTS } from '@/config/api'
import axios from 'axios'
import { User, Trash2, Wallet, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type FilterFn,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/ui/data-table'
import { Card } from '@/components/ui/card'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { useAuthStore } from "@/store/authStore"
import { ChargeFlow, type ChargeClient } from '@/components/charge/ChargeFlow'
import { useCashGate } from '@/components/CashCut/useCashGate'
import NewClientModal from '@/components/Clients/NewClientModal'
import DetailsClientModal from '@/components/Clients/DetailsClientModal'
import RegisterFingerprintModal from '@/components/Clients/RegisterFingerprintModal'
import ViewClientDiets from '@/components/diets/ViewClientDiets'
import ProtectedModule from '@/components/global/ProtectedModule'
import { ClientIdentity, MembershipStatus } from '@/components/Clients/ClientSummary'
import {
  MEMBERSHIP_FILTERS,
  formatLastVisit,
  matchesMembershipFilter,
  needsRenewal,
  normalizeText,
  type ClientMembership,
  type MembershipFilter,
} from '@/components/Clients/clientMembership'



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
  membership?: ClientMembership
  lastVisitAt?: string | null
}

type ChargeTarget = { client: ChargeClient; startWith?: 'membership' }

const getFullName = (user: UserData) => `${user.profile.names} ${user.profile.lastNames}`.trim()

// Busca por nombre, usuario, correo, teléfono o plan, sin importar acentos ni orden de las palabras.
const clientSearchFilter: FilterFn<UserData> = (row, _columnId, value) => {
  const haystack = normalizeText(
    [
      getFullName(row.original),
      row.original.username,
      row.original.email,
      row.original.profile.phone,
      row.original.membership?.planName,
    ].filter(Boolean).join(' ')
  )

  return normalizeText(String(value ?? ''))
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token))
}

export default function Page() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [searchParams] = useSearchParams()
  const [globalFilter, setGlobalFilter] = useState(() => searchParams.get('search') ?? '')
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>(() => {
    const requested = searchParams.get('membership')
    return MEMBERSHIP_FILTERS.find(({ value }) => value === requested)?.value ?? 'all'
  })
  const [chargeTarget, setChargeTarget] = useState<ChargeTarget | null>(null)
  const [detailsClientId, setDetailsClientId] = useState<string | null>(null)
  const { ensureCash, cashGateDialog } = useCashGate()
  const isMobile = useIsMobile()

  const brandId = useAuthStore((state) => state.getBrandId())

  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        MEMBERSHIP_FILTERS.map(({ value }) => [
          value,
          users.filter((user) => matchesMembershipFilter(user.membership, value)).length,
        ])
      ) as Record<MembershipFilter, number>,
    [users]
  )

  const visibleUsers = useMemo(
    () => users.filter((user) => matchesMembershipFilter(user.membership, membershipFilter)),
    [users, membershipFilter]
  )

  const repeatedNames = useMemo(() => {
    const counts = new Map<string, number>()
    users.forEach((user) => {
      const key = normalizeText(getFullName(user))
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name))
  }, [users])

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
      id: "client",
      header: "Socio",
      accessorFn: (row) => getFullName(row),
      cell: ({ row }) => (
        <ClientIdentity
          names={row.original.profile.names}
          lastNames={row.original.profile.lastNames}
          username={row.original.username}
          email={row.original.email}
          phone={row.original.profile.phone}
          active={row.original.status}
          isNameRepeated={repeatedNames.has(normalizeText(getFullName(row.original)))}
        />
      ),
    },
    {
      id: "membership",
      header: "Membresía",
      accessorFn: (row) => row.membership?.state ?? "none",
      cell: ({ row }) => <MembershipStatus membership={row.original.membership} />,
    },
    {
      id: "lastVisit",
      header: "Última visita",
      accessorFn: (row) => row.lastVisitAt ?? "",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatLastVisit(row.original.lastVisitAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const client = {
          value: row.original._id,
          label: getFullName(row.original),
        }
        const renewal = needsRenewal(row.original.membership)

        return (
          <div className="flex items-center justify-end gap-2">
            <ProtectedModule page="Clients" type="read" method="hide">
              <Button
                size="sm"
                variant={renewal ? "default" : "outline"}
                className="h-10 min-w-24 gap-1.5"
                onClick={() =>
                  ensureCash(() =>
                    setChargeTarget({ client, startWith: renewal ? "membership" : undefined })
                  )
                }
              >
                <Wallet className="h-4 w-4" />
                {renewal ? "Renovar" : "Cobrar"}
              </Button>
            </ProtectedModule>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <RowActionsButton label="Más acciones" />
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
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: visibleUsers,
    columns,
    globalFilterFn: clientSearchFilter,
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
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono, usuario, correo o plan..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="h-11 w-full pl-9"
              autoFocus={!isMobile}
            />
          </div>
        </div>

        {/* Filtros por estado de membresía */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por membresía">
          {MEMBERSHIP_FILTERS.map(({ value, label }) => {
            const selected = membershipFilter === value

            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setMembershipFilter(value)}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
              >
                {label}
                <span className={`rounded-full px-1.5 text-xs ${selected ? "bg-primary-foreground/20" : "bg-muted"}`}>
                  {filterCounts[value]}
                </span>
              </button>
            )
          })}
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
                  <Card
                    key={row.id}
                    className="bg-card rounded-xl border border-border/60 shadow-sm p-4 space-y-3 transition-shadow hover:shadow-md cursor-pointer"
                    onClick={() => setDetailsClientId(row.original._id)}
                  >
                    <div className="min-w-0">
                      {flexRender(row.getVisibleCells()[0].column.columnDef.cell, row.getVisibleCells()[0].getContext())}
                    </div>
                    <div className="flex items-start justify-between gap-3 border-t border-border/60 pt-3">
                      <div className="space-y-1">
                        <MembershipStatus membership={row.original.membership} />
                        <p className="text-xs text-muted-foreground">
                          Última visita: {formatLastVisit(row.original.lastVisitAt)}
                        </p>
                      </div>
                      <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
                        {actionsCell ? flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext()) : null}
                      </div>
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
          <DataTable
            table={table}
            loading={loading}
            loadingText="Cargando usuarios..."
            emptyText="No se encontraron usuarios."
            onRowClick={(client) => setDetailsClientId(client._id)}
          />
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

      <ChargeFlow
        open={chargeTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setChargeTarget(null)}
        client={chargeTarget?.client}
        startWith={chargeTarget?.startWith}
        onCompleted={asyncLoad}
      />
      {detailsClientId ? (
        <DetailsClientModal
          clientId={detailsClientId}
          onClientUpdated={asyncLoad}
          open
          onOpenChange={(nextOpen) => !nextOpen && setDetailsClientId(null)}
        />
      ) : null}
      {cashGateDialog}
    </div>
  )
}
