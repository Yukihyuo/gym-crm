import { useState } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { KeyRound } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"

interface StaffUserChangePasswordModalProps {
  userId: string
  onSuccess?: () => void
}

export function StaffUserChangePasswordModal({ userId, onSuccess }: StaffUserChangePasswordModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const token = useAuthStore((state) => state.token)

  const resetForm = () => {
    setNewPassword("")
    setConfirmPassword("")
  }

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Todos los campos son obligatorios")
      return
    }

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(
        API_ENDPOINTS.STAFF.CHANGE_PASSWORD,
        {
          userId,
          newPassword,
        },
        {
          headers: {
            Authorization: token,
          },
        }
      )

      toast.success(response.data.message || "Contraseña actualizada exitosamente")
      setOpen(false)
      resetForm()
      onSuccess?.()
    } catch (error) {
      console.error("Error al cambiar contraseña:", error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Error al cambiar contraseña")
      } else {
        toast.error("Error al cambiar contraseña")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          resetForm()
        }
      }}
    >
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            setOpen(true)
          }}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Cambiar contraseña
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>Define una nueva contraseña para este usuario.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva contraseña *</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Mínimo 6 caracteres"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repite la contraseña"
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Actualizando..." : "Guardar contraseña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
