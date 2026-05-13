import { useEffect, useRef } from "react"
import { useClientAccessFlow } from "@/components/Clients/useClientAccessFlow"
import { PageHeader } from "@/components/global/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Keyboard, QrCode, ShieldCheck } from "lucide-react"

type MembershipInfo = NonNullable<NonNullable<ReturnType<typeof useClientAccessFlow>["accessData"]>["membership"]>

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

export default function Page() {
  const flow = useClientAccessFlow({ enabled: true })
  const manualInputRef = useRef<HTMLInputElement | null>(null)
  const { setMode, accessGranted, resetAccessFlow } = flow

  useEffect(() => {
    setMode("qr")
  }, [setMode])

  useEffect(() => {
    const focusManualInput = () => {
      manualInputRef.current?.focus({ preventScroll: true })
    }

    focusManualInput()

    const focusInterval = window.setInterval(() => {
      focusManualInput()
    }, 3000)

    window.addEventListener("focus", focusManualInput)

    return () => {
      window.clearInterval(focusInterval)
      window.removeEventListener("focus", focusManualInput)
    }
  }, [])

  useEffect(() => {
    if (!accessGranted) {
      return
    }

    const autoCloseTimeout = window.setTimeout(() => {
      resetAccessFlow()
    }, 5000)

    return () => window.clearTimeout(autoCloseTimeout)
  }, [accessGranted, resetAccessFlow])

  const closeResponseModal = () => {
    resetAccessFlow()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Acceso de clientes" },
        ]}
        title="Control de acceso"
        description="Registra entradas de clientes por QR o de forma manual desde una vista dedicada."
        icon={<QrCode className="h-5 w-5" />}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Registro de acceso</CardTitle>
            <CardDescription>
              Escanea el QR y usa email/teléfono en paralelo para registrar la entrada más rápido.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium">Cámara QR</p>
                <div className="mx-auto w-full max-w-70 overflow-hidden rounded-md border bg-black" id={flow.scannerElementId} />

                {flow.scanStatus ? (
                  <p className="text-sm text-muted-foreground">{flow.scanStatus}</p>
                ) : null}

                {flow.scanError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {flow.scanError}
                  </div>
                ) : null}
              </div>

              <form
                className="flex flex-col gap-3 rounded-lg border p-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void flow.manualLogin()
                }}
              >
                <p className="text-sm font-medium">Respaldo manual</p>
                <p className="text-sm text-muted-foreground">
                  Ingresa el email o número de teléfono del cliente y presiona Enter.
                </p>

                <Input
                  ref={manualInputRef}
                  placeholder="Usuario o teléfono"
                  value={flow.manualInput}
                  onChange={(event) => {
                    flow.setManualInput(event.target.value)
                    flow.clearManualError()
                  }}
                  disabled={flow.manualLoading}
                />

                {flow.manualError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {flow.manualError}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button type="submit" disabled={flow.manualLoading}>
                    {flow.manualLoading ? "Verificando..." : "Registrar acceso"}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-4 w-4" />
                Acceso por QR
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Usa la cámara del dispositivo para leer el código del cliente y registrar la visita en segundos.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Keyboard className="h-4 w-4" />
                Respaldo manual
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Si el QR no está disponible, busca al cliente con su usuario o número telefónico.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                Validación automática
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              El sistema valida la suscripción activa y muestra de inmediato el plan y la vigencia.
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={accessGranted} onOpenChange={(nextOpen) => !nextOpen && closeResponseModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resultado del acceso</DialogTitle>
            <DialogDescription>
              Este mensaje se cierra automáticamente en 5 segundos.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded-md border border-green-300 bg-green-50 p-6">
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

          <DialogFooter>
            <Button variant="outline" onClick={closeResponseModal}>
              Cerrar ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}