import { useState } from 'react'

import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUserStore } from "@/store/userStore"

import { LogOut } from 'lucide-react'

export default function LogOutButton() {
  const [open, setOpen] = useState(false)
  const clearSession = useUserStore((state) => state.clearSession)

  const handleOpenConfirm = (event: Event) => {
    event.preventDefault()
    setOpen(true)
  }

  const handleConfirmLogout = () => {
    clearSession()
    setOpen(false)
  }

  return (
    <>
      <DropdownMenuItem onSelect={handleOpenConfirm}>
        <LogOut /> Cerrar sesión
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar sesión?</DialogTitle>
            <DialogDescription>
              Tu sesión actual se cerrará y tendrás que volver a iniciar sesión.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmLogout}>
              Cerrar sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}