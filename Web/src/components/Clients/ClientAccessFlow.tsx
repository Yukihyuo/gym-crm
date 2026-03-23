import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2 } from "lucide-react"
import type { ClientAccessFlowState } from "./useClientAccessFlow"

type MembershipInfo = NonNullable<ClientAccessFlowState["accessData"]>["membership"]

type ClientAccessFlowContentProps = {
  flow: ClientAccessFlowState
}

const formatDuration = (membership?: MembershipInfo | null) => {
  const value = membership?.duration?.value
  const unit = membership?.duration?.unit

  if (!value || !unit) {
    return "No disponible"
  }

  const labels: Record<string, { singular: string, plural: string }> = {
    days: { singular: "día", plural: "días" },
    weeks: { singular: "semana", plural: "semanas" },
    months: { singular: "mes", plural: "meses" },
    years: { singular: "año", plural: "años" },
  }

  const unitLabel = labels[unit] ?? { singular: unit, plural: unit }
  return `${value} ${value === 1 ? unitLabel.singular : unitLabel.plural}`
}

const formatDaysPending = (daysPending?: number) => {
  if (typeof daysPending !== "number") {
    return "No disponible"
  }

  if (daysPending <= 0) {
    return "Vence hoy"
  }

  if (daysPending === 1) {
    return "1 día restante"
  }

  return `${daysPending} días restantes`
}

export function ClientAccessFlowContent({ flow }: ClientAccessFlowContentProps) {
  if (flow.accessGranted) {
    return (
      <div className="mt-4 rounded-md border border-green-300 bg-green-50 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-semibold text-green-900">
              {flow.accessData?.message ?? "Acceso concedido"}
            </h3>
            <p className="mt-2 text-sm text-green-800">
              Se registró el acceso correctamente para el cliente.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-green-200 bg-white/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-green-700">Cliente</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {flow.accessData?.client ?? "No disponible"}
            </p>
          </div>

          <div className="rounded-md border border-green-200 bg-white/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-green-700">Plan</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {flow.accessData?.membership?.name ?? "No disponible"}
            </p>
          </div>

          <div className="rounded-md border border-green-200 bg-white/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-green-700">Duración</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatDuration(flow.accessData?.membership)}
            </p>
          </div>

          <div className="rounded-md border border-green-200 bg-white/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-green-700">Vigencia</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatDaysPending(flow.accessData?.daysPending)}
            </p>
          </div>
        </div>

        {flow.accessData?.membership?.description ? (
          <>
            <Separator className="my-4 bg-green-200" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-green-700">Descripción del plan</p>
              <p className="mt-2 text-sm text-slate-700">
                {flow.accessData.membership.description}
              </p>
            </div>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex overflow-hidden rounded-md border text-sm">
        <button
          type="button"
          className={`flex-1 py-2 font-medium transition-colors ${
            flow.mode === "qr"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          onClick={() => flow.setMode("qr")}
        >
          Cámara QR
        </button>
        <button
          type="button"
          className={`flex-1 py-2 font-medium transition-colors ${
            flow.mode === "manual"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          onClick={() => {
            flow.setMode("manual")
            flow.clearManualError()
          }}
        >
          Manual
        </button>
      </div>

      {flow.mode === "qr" ? (
        <>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="mx-auto w-full max-w-70 overflow-hidden rounded-md border bg-black" id={flow.scannerElementId} />
          </div>

          {flow.scanStatus ? (
            <p className="text-sm text-muted-foreground">{flow.scanStatus}</p>
          ) : null}

          {flow.scanError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {flow.scanError}
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Ingresa el email o número de teléfono del cliente.
          </p>
          <Input
            placeholder="Usuario o teléfono"
            value={flow.manualInput}
            onChange={(event) => {
              flow.setManualInput(event.target.value)
              flow.clearManualError()
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void flow.manualLogin()
              }
            }}
            disabled={flow.manualLoading}
          />
          {flow.manualError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {flow.manualError}
            </div>
          ) : null}
          <Button onClick={() => void flow.manualLogin()} disabled={flow.manualLoading}>
            {flow.manualLoading ? "Verificando..." : "Registrar acceso"}
          </Button>
        </div>
      )}
    </div>
  )
}
