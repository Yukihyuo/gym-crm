import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { toast } from "react-toastify"
import { Pencil } from "lucide-react"
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

const editProfileSchema = z.object({
  username: z
    .string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(30, "El usuario no puede exceder 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "El usuario solo puede contener letras, números y guiones bajos"),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, "Email inválido"),
  names: z.string().min(1, "El nombre es requerido").max(50, "El nombre no puede exceder 50 caracteres"),
  lastNames: z
    .string()
    .min(1, "Los apellidos son requeridos")
    .max(50, "Los apellidos no pueden exceder 50 caracteres"),
  phone: z.string().max(20, "El teléfono no puede exceder 20 caracteres").optional(),
})

type EditProfileValues = z.infer<typeof editProfileSchema>

interface StaffUserEditProfileModalProps {
  userId: string
  onSuccess?: () => void
}

export function StaffUserEditProfileModal({ userId, onSuccess }: StaffUserEditProfileModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const token = useAuthStore((state) => state.token)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EditProfileValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editProfileSchema) as any,
    defaultValues: {
      username: "",
      email: "",
      names: "",
      lastNames: "",
      phone: "",
    },
  })

  const loadUser = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.STAFF.GET_BY_ID(userId), {
        headers: {
          Authorization: token,
        },
      })
      const user = response.data.user

      reset({
        username: user?.username || "",
        email: user?.email || "",
        names: user?.profile?.names || "",
        lastNames: user?.profile?.lastNames || "",
        phone: user?.profile?.phone || "",
      })
    } catch (error) {
      console.error("Error al cargar usuario:", error)
      toast.error("Error al cargar la información del usuario")
    } finally {
      setLoading(false)
    }
  }, [reset, token, userId])

  useEffect(() => {
    if (open) {
      loadUser()
    }
  }, [open, loadUser])

  const onSubmit = async (data: EditProfileValues) => {
    try {
      const response = await axios.patch(
        API_ENDPOINTS.STAFF.UPDATE_PROFILE(userId),
        {
          username: data.username,
          email: data.email?.trim() || undefined,
          profile: {
            names: data.names,
            lastNames: data.lastNames,
            phone: data.phone || "",
          },
        },
        {
          headers: {
            Authorization: token,
          },
        }
      )

      toast.success(response.data.message || "Perfil actualizado exitosamente")
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error al actualizar usuario:", error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Error al actualizar usuario")
      } else {
        toast.error("Error al actualizar usuario")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            setOpen(true)
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Editar perfil
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar perfil del usuario</DialogTitle>
          <DialogDescription>Actualiza la información básica del usuario.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando información...</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario *</Label>
                <Input id="username" {...register("username")} disabled={isSubmitting} />
                {errors.username ? <p className="text-sm text-red-500">{errors.username.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input id="email" type="email" {...register("email")} disabled={isSubmitting} />
                {errors.email ? <p className="text-sm text-red-500">{errors.email.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="names">Nombres *</Label>
                <Input id="names" {...register("names")} disabled={isSubmitting} />
                {errors.names ? <p className="text-sm text-red-500">{errors.names.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastNames">Apellidos *</Label>
                <Input id="lastNames" {...register("lastNames")} disabled={isSubmitting} />
                {errors.lastNames ? <p className="text-sm text-red-500">{errors.lastNames.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" {...register("phone")} disabled={isSubmitting} />
                {errors.phone ? <p className="text-sm text-red-500">{errors.phone.message}</p> : null}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
