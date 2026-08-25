import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { Power } from "lucide-react"
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"

interface StaffUserStatusModalProps {
  userId: string
  onSuccess?: () => void
}

export function StaffUserStatusModal({ userId, onSuccess }: StaffUserStatusModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState<boolean | null>(null)

  const token = useAuthStore((state) => state.token)

  const loadUser = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.STAFF.GET_BY_ID(userId), {
        headers: {
          Authorization: token,
        },
      })
      setIsActive(Boolean(response.data.user?.status))
    } catch (error) {
      console.error("Error al cargar estado de usuario:", error)
      toast.error("Error al cargar el estado del usuario")
      setIsActive(null)
    } finally {
      setLoading(false)
    }
  }, [token, userId])

  useEffect(() => {
    if (open) {
      loadUser()
    }
  }, [open, loadUser])

  const handleToggleStatus = async () => {
    if (isActive === null) return

    setLoading(true)
    try {
      const nextStatus = !isActive
      const response = await axios.patch(
        API_ENDPOINTS.STAFF.UPDATE_STATUS(userId),
        { status: nextStatus },
        {
          headers: {
            Authorization: token,
          },
        }
      )

      toast.success(response.data.message || "Estado actualizado exitosamente")
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error al actualizar estado:", error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Error al actualizar estado")
      } else {
        toast.error("Error al actualizar estado")
      }
    } finally {
      setLoading(false)
    }
  }

  const actionLabel = isActive ? "Desactivar usuario" : "Activar usuario"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            setOpen(true)
          }}
        >
          <Power className="mr-2 h-4 w-4" />
          Cambiar estado
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar estado del usuario</DialogTitle>
          <DialogDescription>
            Al desactivar un usuario no podrá iniciar sesión hasta volver a activarlo.
          </DialogDescription>
        </DialogHeader>

        {loading && isActive === null ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Cargando estado...</div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="text-sm text-muted-foreground">Estado actual</div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {isActive ? "Activo" : "Inactivo"}
            </span>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleToggleStatus} disabled={loading || isActive === null}>
            {loading ? "Actualizando..." : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
