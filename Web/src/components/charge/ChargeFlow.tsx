import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarCheck2, ChevronRight, ShoppingCart } from "lucide-react"

import { useModuleAccess } from "@/hooks/use-module-access"
import NewSubscriptionsAssignment from "@/components/subscriptionsAssignment/NewSubscriptionsAssignment"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ChargeClient = { value: string; label: string }

type ChargeFlowProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cliente ya identificado (p. ej. desde su fila): evita volver a buscarlo en el cobro. */
  client?: ChargeClient
  /** Salta el selector cuando ya se sabe qué se cobra (p. ej. renovar desde la fila del socio). */
  startWith?: "membership"
  onCompleted?: () => void
}

type ChargeOptionProps = {
  icon: React.ReactNode
  title: string
  description: string
  onSelect: () => void
}

function ChargeOption({ icon, title, description, onSelect }: ChargeOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-24 w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-base font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  )
}

/**
 * Punto de entrada único para cobrar: el empleado elige qué cobra (membresía o
 * productos) sin tener que saber en qué módulo vive cada cosa.
 */
export function ChargeFlow({ open, onOpenChange, client, startWith, onCompleted }: ChargeFlowProps) {
  const navigate = useNavigate()
  const [membershipChosen, setMembershipChosen] = useState(false)
  const membershipOpen = membershipChosen || startWith === "membership"
  const canChargeMembership = useModuleAccess("SubscriptionsAssignments", "create")
  const canChargeProducts = useModuleAccess("Sales", "create")

  const handleMembershipOpenChange = (nextOpen: boolean) => {
    setMembershipChosen(nextOpen)
    if (!nextOpen) {
      onOpenChange(false)
    }
  }

  const chargeProducts = () => {
    onOpenChange(false)
    navigate("/sales/new", { state: client ? { client } : undefined })
  }

  return (
    <>
      <Dialog open={open && !membershipOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Qué vas a cobrar?</DialogTitle>
            <DialogDescription>
              {client ? `Cobro para ${client.label}.` : "Elige el tipo de cobro para continuar."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {canChargeMembership ? (
              <ChargeOption
                icon={<CalendarCheck2 className="h-6 w-6" />}
                title="Membresía"
                description="Alta o renovación; el acceso queda activo al cobrar."
                onSelect={() => setMembershipChosen(true)}
              />
            ) : null}
            {canChargeProducts ? (
              <ChargeOption
                icon={<ShoppingCart className="h-6 w-6" />}
                title="Productos"
                description="Venta de mostrador con carrito y recibo."
                onSelect={chargeProducts}
              />
            ) : null}
            {!canChargeMembership && !canChargeProducts ? (
              <p className="text-sm text-muted-foreground">
                No tienes permisos para registrar cobros.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <NewSubscriptionsAssignment
        open={open && membershipOpen}
        onOpenChange={handleMembershipOpenChange}
        presetClient={client}
        title="Cobrar membresía"
        description="Selecciona el plan y el método de pago."
        submitLabel="Cobrar"
        onAssignmentCreated={onCompleted}
      />
    </>
  )
}
