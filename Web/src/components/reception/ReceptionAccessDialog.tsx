import { useState } from "react"
import { Loader2 } from "lucide-react"

import { AccessResultDialog } from "@/components/Clients/AccessResultDialog"
import { isRenewableDenial, type AccessResultPayload } from "@/components/Clients/accessResult"
import { requestAccessByClientId, requestAccessByContact } from "@/components/Clients/clientAccessApi"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ReceptionAccessDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Registro de acceso rápido desde el home de recepción: busca al socio por
 * email o teléfono y muestra el resultado (con renovación si aplica).
 */
export function ReceptionAccessDialog({ open, onOpenChange }: ReceptionAccessDialogProps) {
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AccessResultPayload | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const query = value.trim()
    if (!query) {
      setError("Ingresa un email o número de teléfono")
      return
    }

    setLoading(true)
    setError("")
    try {
      const payload = await requestAccessByContact(query)

      if (payload.kind === "error" && !isRenewableDenial(payload)) {
        setError(payload.message)
        return
      }

      setResult(payload)
      setValue("")
    } finally {
      setLoading(false)
    }
  }

  const retryAfterRenew = async (clientId: string) => {
    setResult(await requestAccessByClientId(clientId))
  }

  return (
    <>
      <Dialog
        open={open && !result}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setError("")
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar acceso</DialogTitle>
            <DialogDescription>
              Ingresa el email o teléfono del socio y presiona Enter para registrar su entrada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reception-access-contact">Email o teléfono</Label>
              <Input
                id="reception-access-contact"
                autoFocus
                placeholder="usuario@correo.com o 5551234567"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value)
                  setError("")
                }}
                disabled={loading}
              />
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Registrar acceso"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AccessResultDialog
        open={Boolean(result)}
        data={result}
        onClose={() => setResult(null)}
        onRenewed={retryAfterRenew}
      />
    </>
  )
}
