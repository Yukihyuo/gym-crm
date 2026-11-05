import { useState } from "react"
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react"

import NewSubscriptionsAssignment from "@/components/subscriptionsAssignment/NewSubscriptionsAssignment"
import { useCashGate } from "@/components/CashCut/useCashGate"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { isRenewableDenial, type AccessResultPayload } from "./accessResult"

type AccessResultDialogProps = {
  open: boolean
  data: AccessResultPayload | null
  onClose: () => void
  /**
   * Habilita "Renovar membresía" en los rechazos por membresía. Se invoca tras
   * cobrar la renovación para registrar el acceso del cliente.
   */
  onRenewed?: (clientId: string) => Promise<void> | void
}

const PALETTES = {
  success: {
    frame: "border-green-300 bg-green-50",
    iconBg: "bg-green-100 text-green-700",
    title: "text-green-900",
    text: "text-green-800",
    label: "text-green-700",
    card: "border-green-200 bg-white/80",
    separator: "bg-green-200",
    Icon: CheckCircle2,
  },
  error: {
    frame: "border-red-300 bg-red-50",
    iconBg: "bg-red-100 text-red-700",
    title: "text-red-900",
    text: "text-red-800",
    label: "text-red-700",
    card: "border-red-200 bg-white/80",
    separator: "bg-red-200",
    Icon: XCircle,
  },
} as const

export function AccessResultDialog({ open, data, onClose, onRenewed }: AccessResultDialogProps) {
  const [renewOpen, setRenewOpen] = useState(false)
  const [registering, setRegistering] = useState(false)
  const { ensureCash, cashGateDialog } = useCashGate()

  const palette = PALETTES[data?.kind === "error" ? "error" : "success"]
  const renewableClientId = isRenewableDenial(data) ? data.clientId : null
  const canRenew = Boolean(renewableClientId && onRenewed)
  const details = (data?.details ?? []).filter(
    (detail) => !(canRenew && data?.client && detail.label === "Cliente")
  )

  const handleRenewed = async () => {
    if (!renewableClientId) {
      return
    }

    setRegistering(true)
    try {
      await onRenewed?.(renewableClientId)
    } finally {
      setRegistering(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !registering && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resultado del acceso</DialogTitle>
          <DialogDescription>
            {canRenew
              ? "Resuelve el acceso sin salir de esta pantalla."
              : "Este mensaje se cierra automáticamente en 5 segundos."}
          </DialogDescription>
        </DialogHeader>

        <div className={`mt-2 rounded-md border p-6 ${palette.frame}`}>
          <div className="flex flex-col items-center text-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${palette.iconBg}`}>
              <palette.Icon className="h-7 w-7" />
            </div>

            <div className="mt-4">
              <h3 className={`text-lg font-semibold ${palette.title}`}>
                {data?.title ?? "Resultado del acceso"}
              </h3>
              {canRenew && data?.client ? (
                <p className="mt-1 text-2xl font-bold text-slate-900">{data.client}</p>
              ) : null}
              <p className={`mt-2 text-sm ${palette.text}`}>
                {data?.message ?? "Sin mensaje disponible"}
              </p>
            </div>
          </div>

          {details.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {details.map((detail) => (
                <div key={`${detail.label}-${detail.value}`} className={`rounded-md border p-3 ${palette.card}`}>
                  <p className={`text-xs font-medium uppercase tracking-wide ${palette.label}`}>
                    {detail.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {detail.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {data?.membership?.description ? (
            <>
              <Separator className={`my-4 ${palette.separator}`} />
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${palette.label}`}>
                  Descripción del plan
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {data.membership.description}
                </p>
              </div>
            </>
          ) : null}

          {data?.kind === "error" && !details.length ? (
            <div className="mt-6 rounded-md border border-red-200 bg-white/80 p-3 text-sm text-red-900">
              No se encontraron más detalles para mostrar.
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="lg" onClick={onClose} disabled={registering}>
            {canRenew ? "Cerrar" : "Cerrar ahora"}
          </Button>

          {canRenew ? (
            <Button
              size="lg"
              autoFocus
              onClick={() => ensureCash(() => setRenewOpen(true))}
              disabled={registering}
            >
              {registering ? (
                <>
                  <Loader2 className="animate-spin" />
                  Registrando acceso...
                </>
              ) : (
                <>
                  <RefreshCw />
                  Renovar membresía
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>

        {renewableClientId && canRenew ? (
          <NewSubscriptionsAssignment
            open={renewOpen}
            onOpenChange={setRenewOpen}
            presetClient={{ value: renewableClientId, label: data?.client ?? "Cliente" }}
            presetPlanId={data?.lastMembership?.planId}
            title="Renovar membresía"
            description="Confirma el plan y el método de pago. El acceso se registrará automáticamente."
            submitLabel="Cobrar y registrar acceso"
            onAssignmentCreated={handleRenewed}
          />
        ) : null}
        {cashGateDialog}
      </DialogContent>
    </Dialog>
  )
}