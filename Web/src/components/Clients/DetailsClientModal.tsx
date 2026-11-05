import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios, { type AxiosError } from "axios"
import { toast } from "react-toastify"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Eye, Pencil, X } from "lucide-react"
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"

// Schema de validación con Zod
const clientSchema = z.object({
  email: z.string()
    .min(1, "El email es requerido")
    .email("Email inválido"),
  names: z.string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  lastNames: z.string()
    .min(1, "Los apellidos son requeridos")
    .max(50, "Los apellidos no pueden exceder 50 caracteres"),
  phone: z.string()
    .max(20, "El teléfono no puede exceder 20 caracteres")
    .optional(),
  status: z.boolean(),
})

type ClientFormData = z.infer<typeof clientSchema>

interface DetailsClientProps {
  clientId: string
  onClientUpdated?: () => void
  /** Modo controlado: el padre decide cuándo abrir (p. ej. al tocar una fila) y no se muestra el item de menú. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function DetailsClientModal({
  clientId,
  onClientUpdated,
  open: controlledOpen,
  onOpenChange,
}: DetailsClientProps) {
  const { token } = useAuthStore()

  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      email: "",
      names: "",
      lastNames: "",
      phone: "",
      status: true,
    },
  })

  const status = watch("status")

  const loadClientData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.CLIENTS.GET_BY_ID(clientId), {
        headers: {
          Authorization: token
        }
      })

      const clientData = response.data.client
      reset({
        email: clientData.email || "",
        names: clientData.profile?.names || "",
        lastNames: clientData.profile?.lastNames || "",
        phone: clientData.profile?.phone || "",
        status: clientData.status ?? true,
      })

    } catch (error) {
      console.error("Error al cargar cliente:", error)
      const axiosError = error as AxiosError<{ message: string }>
      toast.error(axiosError.response?.data?.message || "Error al cargar cliente")
    } finally {
      setIsLoading(false)
    }
  }, [clientId, token, reset])

  // Load client data when modal opens
  useEffect(() => {
    if (open && clientId) {
      loadClientData()
      setIsEditing(false)
    }
  }, [open, clientId, loadClientData])

  const onSubmit = async (data: ClientFormData) => {
    try {
      const payload = {
        email: data.email,
        profile: {
          names: data.names,
          lastNames: data.lastNames,
          phone: data.phone || "",
        },
        status: data.status
      }

      const response = await axios.put(API_ENDPOINTS.CLIENTS.UPDATE_BY_ID(clientId), payload, {
        headers: {
          Authorization: token
        }
      })

      toast.success(response.data.message || "Cliente actualizado exitosamente")
      
      if (onClientUpdated) {
        onClientUpdated()
      }
      
      setIsEditing(false)
      
    } catch (error) {
      console.error("Error al actualizar cliente:", error)
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage = axiosError.response?.data?.message || "Error al actualizar cliente"
      toast.error(errorMessage)
    }
  }

  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false)
      loadClientData()
    } else {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled ? (
        <DialogTrigger asChild>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setOpen(true)
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver detalles
          </DropdownMenuItem>
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {isEditing ? "Editar Cliente" : "Detalles del Cliente"}
              </DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? "Actualiza la información del cliente" 
                  : "Visualiza la información del cliente"}
              </DialogDescription>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Cargando detalles...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              {/* Campo Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  {...register("email")}
                  readOnly={!isEditing}
                  disabled={isSubmitting}
                  className={`${errors.email ? "border-red-500" : ""} ${!isEditing ? "bg-muted cursor-default" : ""}`}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              {/* Campo Nombres */}
              <div className="space-y-2">
                <Label htmlFor="names">Nombres *</Label>
                <Input
                  id="names"
                  placeholder="Juan Carlos"
                  {...register("names")}
                  readOnly={!isEditing}
                  disabled={isSubmitting}
                  className={`${errors.names ? "border-red-500" : ""} ${!isEditing ? "bg-muted cursor-default" : ""}`}
                />
                {errors.names && <p className="text-sm text-red-500">{errors.names.message}</p>}
              </div>

              {/* Campo Apellidos */}
              <div className="space-y-2">
                <Label htmlFor="lastNames">Apellidos *</Label>
                <Input
                  id="lastNames"
                  placeholder="Pérez García"
                  {...register("lastNames")}
                  readOnly={!isEditing}
                  disabled={isSubmitting}
                  className={`${errors.lastNames ? "border-red-500" : ""} ${!isEditing ? "bg-muted cursor-default" : ""}`}
                />
                {errors.lastNames && <p className="text-sm text-red-500">{errors.lastNames.message}</p>}
              </div>

              {/* Campo Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="+1234567890"
                  {...register("phone")}
                  readOnly={!isEditing}
                  disabled={isSubmitting}
                  className={!isEditing ? "bg-muted cursor-default" : ""}
                />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
              </div>

              {/* Estado */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="status"
                  checked={status}
                  onCheckedChange={() => {}}
                  disabled={!isEditing || isSubmitting}
                  {...register("status")}
                />
                <Label htmlFor="status" className="font-normal cursor-pointer">
                  Cliente activo
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting || isLoading}
              >
                {isEditing ? <X className="h-4 w-4 mr-1" /> : null}
                {isEditing ? "Cancelar" : "Cerrar"}
              </Button>

              {isEditing && (
                <Button type="submit" disabled={isSubmitting || isLoading}>
                  {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
