import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"

interface StaffAssignment {
  roleId?: string
  roleName?: string
  scope?: {
    type?: "brand" | "store"
    targetId?: string
  }
}

interface StaffDetails {
  _id: string
  username: string
  email?: string
  status: boolean
  profile: {
    names: string
    lastNames: string
    phone?: string
  }
  assignments?: StaffAssignment[]
  createdAt?: string
  updatedAt?: string
}

interface StaffUserDetailsModalProps {
  userId: string
}

export function StaffUserDetailsModal({ userId }: StaffUserDetailsModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState<StaffDetails | null>(null)

  const token = useAuthStore((state) => state.token)

  const loadUser = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.STAFF.GET_BY_ID(userId), {
        headers: {
          Authorization: token,
        },
      })
      setStaff(response.data.user ?? null)
    } catch (error) {
      console.error("Error al cargar usuario:", error)
      toast.error("Error al cargar la información del usuario")
      setStaff(null)
    } finally {
      setLoading(false)
    }
  }, [token, userId])

  useEffect(() => {
    if (open) {
      loadUser()
    }
  }, [open, loadUser])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            setOpen(true)
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver información
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Información del usuario</DialogTitle>
          <DialogDescription>Detalle del perfil y accesos asignados.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando información...</div>
        ) : !staff ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No se encontró información del usuario.</div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Usuario</p>
                <p className="font-medium">{staff.username}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    staff.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {staff.status ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nombres</p>
                <p className="font-medium">{staff.profile?.names || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Apellidos</p>
                <p className="font-medium">{staff.profile?.lastNames || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{staff.email || "Sin email"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="font-medium">{staff.profile?.phone || "Sin teléfono"}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">Roles asignados</p>
              {staff.assignments && staff.assignments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {staff.assignments.map((assignment, index) => (
                    <span
                      key={`${assignment.roleId || assignment.roleName || "role"}-${index}`}
                      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                    >
                      {assignment.roleName || "Sin rol"}
                      <span className="ml-2 text-muted-foreground">
                        {assignment.scope?.type === "store" ? "Tienda" : "Marca"}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay roles asignados.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
