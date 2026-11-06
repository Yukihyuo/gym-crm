import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, ScanLine, Search, Store, Wallet } from "lucide-react"

import { ReceptionAccessDialog } from "@/components/reception/ReceptionAccessDialog"
import { ChargeFlow } from "@/components/charge/ChargeFlow"
import { useCashGate } from "@/components/CashCut/useCashGate"
import { useModuleAccess } from "@/hooks/use-module-access"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/authStore"
import { useCashCutStore } from "@/store/cashCutStore"
import { cn } from "@/lib/utils"

function ActionLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="sm" className="h-auto w-full justify-start px-0 text-muted-foreground hover:text-foreground" onClick={onClick}>
      {children}
      <ArrowRight className="ml-auto h-4 w-4" />
    </Button>
  )
}

/**
 * Home de recepción: las tres tareas críticas de mostrador a un clic, sin tener
 * que navegar por módulos administrativos.
 */
export default function ReceptionHome() {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.user?.profile)
  const store = useAuthStore((state) => state.getActiveStore())
  const cashCutId = useCashCutStore((state) => state.cashCutId)
  const { ensureCash, cashGateDialog } = useCashGate()

  const [search, setSearch] = useState("")
  const [accessOpen, setAccessOpen] = useState(false)
  const [chargeOpen, setChargeOpen] = useState(false)

  const canChargeMembership = useModuleAccess("SubscriptionsAssignments", "create")
  const canChargeProducts = useModuleAccess("Sales", "create")
  const canViewClients = useModuleAccess("Clients", "read")
  const canCharge = canChargeMembership || canChargeProducts

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = search.trim()
    navigate(query ? `/clients?search=${encodeURIComponent(query)}` : "/clients")
  }

  const storeName = store?.name || store?._id || store?.id || "Sin tienda activa"
  const cashOpen = Boolean(cashCutId)

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-2 sm:p-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          ¡Hola, {profile?.names || "recepción"}! 👋
        </h1>
        <p className="text-muted-foreground">¿En qué te ayudamos hoy?</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
            <Store className="h-4 w-4" />
            {storeName}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium",
              cashOpen
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            )}
          >
            <span className={cn("size-2 rounded-full", cashOpen ? "bg-emerald-500" : "bg-amber-500")} />
            {cashOpen ? "Caja abierta" : "Caja cerrada"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {canViewClients ? (
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Buscar socio
              </CardTitle>
              <CardDescription>
                Localiza un perfil por nombre, teléfono, correo o usuario.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Nombre, teléfono o correo..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11"
                />
                <Button type="submit" size="icon" className="h-11 w-11" aria-label="Buscar">
                  <ArrowRight />
                </Button>
              </form>
              <ActionLink onClick={() => navigate("/clients")}>Ver todos los clientes</ActionLink>
            </CardContent>
          </Card>
        ) : null}

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Registrar acceso
            </CardTitle>
            <CardDescription>
              Registra la entrada de un socio por email o teléfono.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-3">
            <Button size="lg" className="h-11 w-full justify-start" onClick={() => setAccessOpen(true)}>
              <ScanLine className="h-4 w-4" />
              Registrar entrada
            </Button>
            <ActionLink onClick={() => navigate("/access")}>Control de acceso con QR</ActionLink>
          </CardContent>
        </Card>

        {canCharge ? (
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Cobrar / renovar
              </CardTitle>
              <CardDescription>
                Cobra membresías o ventas de mostrador en un solo lugar.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3">
              <Button
                size="lg"
                className="h-11 w-full justify-start"
                onClick={() => ensureCash(() => setChargeOpen(true))}
              >
                <Wallet className="h-4 w-4" />
                Iniciar cobro
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <ReceptionAccessDialog open={accessOpen} onOpenChange={setAccessOpen} />
      <ChargeFlow open={chargeOpen} onOpenChange={setChargeOpen} />
      {cashGateDialog}
    </div>
  )
}
