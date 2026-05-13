import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
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
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"

const clientSchema = z.object({
  username: z.string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(30, "El usuario no puede exceder 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "El usuario solo puede contener letras, números y guiones bajos"),
  email: z.union([z.string().email("Email inválido"), z.literal("")]),
  accessCode: z.string().optional(),
  names: z.string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  lastNames: z.string()
    .min(1, "Los apellidos son requeridos")
    .max(50, "Los apellidos no pueden exceder 50 caracteres"),
  phone: z.string()
    .max(20, "El teléfono no puede exceder 20 caracteres")
    .optional(),
})

type ClientFormValues = z.infer<typeof clientSchema>

interface NewClientModalProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export default function NewClientModal({ onSuccess, trigger }: NewClientModalProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClientFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(clientSchema) as any,
    defaultValues: {
      username: "",
      email: "",
      accessCode: "",
      names: "",
      lastNames: "",
      phone: "",
    },
  })

  const onSubmit = async (data: ClientFormValues) => {
    if (!activeStoreId) {
      toast.error("No hay una tienda activa seleccionada")
      return
    }

    setIsLoading(true)
    try {
      const response = await axios.post(API_ENDPOINTS.CLIENTS.REGISTER, {
        username: data.username,
        email: data.email.trim() || undefined,
        accessCode: data.accessCode?.trim() || undefined,
        storeId: activeStoreId,
        profile: {
          names: data.names,
          lastNames: data.lastNames,
          phone: data.phone?.trim() || undefined,
        },
      })

      toast.success(response.data.message || "Cliente creado exitosamente")
      toast.info(
        `Usuario: ${response.data?.credentials?.username || data.username} | Contraseña: ${response.data?.credentials?.defaultPassword || data.username}`,
        { autoClose: 10000 }
      )

      reset()
      setOpen(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Error al crear cliente"
        toast.error(message)
      } else {
        toast.error("Error inesperado al crear cliente")
      }
      console.error("Error al crear cliente:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button>Nuevo Cliente</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-112.5">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">
                Usuario <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                placeholder="cliente123"
                {...register("username")}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Solo letras, números y guiones bajos
              </p>
            </div>

            {/* <div className="grid gap-2">
              <Label htmlFor="email">
                Email (opcional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@ejemplo.com"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div> */}

            <div className="grid gap-2">
              <Label htmlFor="accessCode">Código de acceso (opcional)</Label>
              <Input
                id="accessCode"
                placeholder="ABC123"
                {...register("accessCode")}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="names">
                Nombres <span className="text-red-500">*</span>
              </Label>
              <Input
                id="names"
                placeholder="Juan Carlos"
                {...register("names")}
                disabled={isLoading}
              />
              {errors.names && (
                <p className="text-sm text-red-500">{errors.names.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastNames">
                Apellidos <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastNames"
                placeholder="Pérez García"
                {...register("lastNames")}
                disabled={isLoading}
              />
              {errors.lastNames && (
                <p className="text-sm text-red-500">{errors.lastNames.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                placeholder="+1234567890"
                {...register("phone")}
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>

            {/* <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Nota:</strong> Si no se llena email y sí accessCode, la contraseña inicial será el accessCode. Si tampoco se llena accessCode, el backend genera una contraseña aleatoria.
              </p>
            </div> */}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
