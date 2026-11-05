import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OpenCashCut } from "./openCashCut"

type OpenCashCutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpened: () => void
}

export function OpenCashCutDialog({ open, onOpenChange, onOpened }: OpenCashCutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abre la caja para continuar</DialogTitle>
          <DialogDescription>
            Se requiere una caja abierta para registrar cobros. Al abrirla seguirás
            automáticamente con lo que estabas haciendo.
          </DialogDescription>
        </DialogHeader>

        <OpenCashCut onSuccess={onOpened} />
      </DialogContent>
    </Dialog>
  )
}
