import { useState } from "react"
import { Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCashCutStore } from "@/store/cashCutStore"
import { OpenCashCut } from "./openCashCut"
import { CloseCashCut } from "./closeCashCut"

interface CashCutModalProps {
  trigger?: React.ReactNode
}

export default function CashCutModal({ trigger }: CashCutModalProps) {
  const [open, setOpen] = useState(false)
  const cashCutId = useCashCutStore((state) => state.cashCutId)

  const isOpenCashCut = typeof cashCutId === "string" && cashCutId.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            {isOpenCashCut ? "Cerrar caja" : "Abrir caja"}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isOpenCashCut ? "Cerrar caja" : "Abrir caja"}</DialogTitle>
          <DialogDescription>
            {isOpenCashCut
              ? "Registra los totales reportados para cerrar el corte de caja actual."
              : "Inicia un nuevo corte de caja para comenzar a registrar movimientos."}
          </DialogDescription>
        </DialogHeader>

        {isOpenCashCut ? (
          <CloseCashCut onSuccess={() => setOpen(false)} />
        ) : (
          <OpenCashCut onSuccess={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
