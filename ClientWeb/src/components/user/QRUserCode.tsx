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


import { QRCodeSVG } from 'qrcode.react';
import { useUserStore } from "@/store/userStore";
import { QrCode } from "lucide-react";

export function QRUserCode() {
  const { user } = useUserStore()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
        <QrCode /> QR de usuario
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Código QR de acceso</DialogTitle>
          <DialogDescription>
            Escanea este código QR para acceder rápidamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2">
          <QRCodeSVG value={user?.id || "Sin token"} size={200} />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
