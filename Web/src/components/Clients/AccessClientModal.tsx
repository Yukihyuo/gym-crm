import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "../ui/dropdown-menu"
import { useState } from "react"

import { QrCode } from "lucide-react"
import { ClientAccessFlowContent } from "./ClientAccessFlow"
import { useClientAccessFlow } from "./useClientAccessFlow"

export function AccessClientModal() {
  const [open, setOpen] = useState(false)
  const flow = useClientAccessFlow({ enabled: open })


  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          flow.resetAccessFlow()
        }
      }}
    >
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
          <QrCode />
          QR de usuario
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <div className="space-y-4">
          {!flow.accessGranted ? (
            <>
              <DialogHeader>
                <DialogTitle>Acceso de cliente</DialogTitle>
                <DialogDescription>
                  Escanea el QR del cliente o ingrésalo manualmente.
                </DialogDescription>
              </DialogHeader>

              <ClientAccessFlowContent flow={flow} />

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cerrar</Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : (
          <>
            <ClientAccessFlowContent flow={flow} />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={flow.resetAccessFlow}>
                Registrar otro acceso
              </Button>
              <Button onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
