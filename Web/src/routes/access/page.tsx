import { ClientAccessFlowContent } from "@/components/Clients/ClientAccessFlow"
import { useClientAccessFlow } from "@/components/Clients/useClientAccessFlow"
import { PageHeader } from "@/components/global/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Keyboard, QrCode, ShieldCheck } from "lucide-react"

export default function Page() {
  const flow = useClientAccessFlow({ enabled: true })

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
              Escanea el QR del cliente o usa email/teléfono para registrar su entrada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ClientAccessFlowContent flow={flow} />

            {flow.accessGranted ? (
              <div className="flex justify-end">
                <Button variant="outline" onClick={flow.resetAccessFlow}>
                  Registrar otro acceso
                </Button>
              </div>
            ) : null}
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
    </div>
  )
}