import { useEffect, useRef } from "react"
import { AccessResultDialog } from "../../components/Clients/AccessResultDialog"
import { useClientAccessFlow } from "../../components/Clients/useClientAccessFlow"
import { PageHeader } from "@/components/global/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Keyboard, QrCode, ShieldCheck } from "lucide-react"

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

      <AccessResultDialog
        open={accessGranted}
        data={flow.accessData}
        onClose={closeResponseModal}
      />
    </div>
  )
}