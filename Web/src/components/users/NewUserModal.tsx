import { useState, useEffect, useCallback } from "react"
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

// Schema de validación con Zod
const userSchema = z.object({
  username: z.string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(30, "El usuario no puede exceder 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "El usuario solo puede contener letras, números y guiones bajos"),
  email: z.string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, "Email inválido"),
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede exceder 100 caracteres"),
  names: z.string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  lastNames: z.string()
    .min(1, "Los apellidos son requeridos")
    .max(50, "Los apellidos no pueden exceder 50 caracteres"),
  phone: z.string()
    .max(20, "El teléfono no puede exceder 20 caracteres")
    .optional(),
  roleId: z.string()
    .min(1, "Debe seleccionar un rol"),
  scopeType: z.enum(["brand", "store"]),
  storeId: z.string().optional()
}).refine((data) => {
  // Si scopeType es 'store', storeId es requerido
  if (data.scopeType === "store") {
    return data.storeId && data.storeId.length > 0
  }
  return true
}, {
  message: "Debe seleccionar una tienda cuando el alcance es de tipo tienda",
  path: ["storeId"]
})

type UserFormValues = z.infer<typeof userSchema>

interface Role {
  _id: string
  name: string
  permissions: string[]
}

interface Store {
  _id: string
  name: string
}

interface NewUserModalProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function NewUserModal({ onSuccess, trigger }: NewUserModalProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [isLoadingStores, setIsLoadingStores] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [stores, setStores] = useState<Store[]>([])

  const brandId = useAuthStore((state) => state.getBrandId())

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<UserFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(userSchema) as any,
    defaultValues: {
      username: "",
      email: "",
      password: "",
      names: "",
      lastNames: "",
      phone: "",
      roleId: "",
      scopeType: "brand",
      storeId: "",
    },
  })

  const scopeType = watch("scopeType")

  // Cargar roles disponibles
  const fetchRoles = useCallback(async () => {
    setIsLoadingRoles(true)
    try {
      const response = await axios.get(API_ENDPOINTS.ROLES.GET_BY_BRAND(brandId || ""))
      setRoles(response.data.roles || [])
    } catch (error) {
      console.error("Error al cargar roles:", error)
      toast.error("Error al cargar los roles disponibles")
    } finally {
      setIsLoadingRoles(false)
    }
  }, [brandId])

  const fetchStores = useCallback(async () => {
    setIsLoadingStores(true)
    try {
      const response = await axios.get(API_ENDPOINTS.STORES.GET_BY_BRAND(brandId || ""))
      setStores(response.data.stores || [])
    } catch (error) {
      console.error("Error al cargar tiendas:", error)
      toast.error("Error al cargar las tiendas disponibles")
    } finally {
      setIsLoadingStores(false)
    }
  }, [brandId])

  // Cargar roles y tiendas cuando se abre el modal
  useEffect(() => {
    if (open) {
      fetchRoles()
      fetchStores()
    }
  }, [open, fetchRoles, fetchStores])

  const onSubmit = async (data: UserFormValues) => {
    // Validar que si es scope tipo store, se haya seleccionado una tienda
    if (data.scopeType === "store" && !data.storeId) {
      toast.error("Debe seleccionar una tienda para el alcance de tipo tienda")
      return
    }

    setIsLoading(true)
    try {
      // Construir el scope
      const scope = data.scopeType === "brand" 
        ? { type: "brand" }
        : { type: "store", targetId: data.storeId }

      const response = await axios.post(API_ENDPOINTS.STAFF.REGISTER, {
        username: data.username,
        email: data.email?.trim() || undefined,
        password: data.password,
        profile: {
          names: data.names,
          lastNames: data.lastNames,
          phone: data.phone || ''
        },
        roleId: data.roleId,
        brandId: brandId,  // ← AGREGADO: brandId es esencial para crear RoleAssignment
        scope: scope       // ← AGREGADO: scope define el alcance del rol
      })

      toast.success(response.data.message || "Usuario creado exitosamente")
      
      // Reset form y cerrar modal
      reset()
      setOpen(false)
      
      // Callback de éxito
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Error al crear usuario"
        toast.error(message)
      } else {
        toast.error("Error inesperado al crear usuario")
      }
      console.error("Error al crear usuario:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
      setRoles([])
      setStores([])
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button>Nuevo</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Completa los datos para crear un nuevo usuario.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Campo Usuario */}
            <div className="grid gap-2">
              <Label htmlFor="username">
                Usuario <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                placeholder="usuario123"
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

            {/* Campo Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email (opcional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div className="grid gap-2">
              <Label htmlFor="password">
                Contraseña <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...register("password")}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Campo Nombres */}
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

            {/* Campo Apellidos */}
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

            {/* Campo Teléfono */}
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

            {/* Select Rol */}
            <div className="grid gap-2">
              <Label htmlFor="roleId">
                Rol <span className="text-red-500">*</span>
              </Label>
              {isLoadingRoles ? (
                <div className="text-sm text-muted-foreground">Cargando roles...</div>
              ) : (
                <>
                  <select
                    id="roleId"
                    {...register("roleId")}
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Seleccionar rol</option>
                    {roles.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {errors.roleId && (
                    <p className="text-sm text-red-500">{errors.roleId.message}</p>
                  )}
                </>
              )}
            </div>

            {/* Select Alcance (Scope Type) */}
            <div className="grid gap-2">
              <Label htmlFor="scopeType">
                Alcance del Rol <span className="text-red-500">*</span>
              </Label>
              <select
                id="scopeType"
                {...register("scopeType")}
                disabled={isLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="brand">Toda la marca</option>
                <option value="store">Tienda específica</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {scopeType === "brand" 
                  ? "El usuario tendrá acceso a todas las tiendas de la marca" 
                  : "El usuario solo tendrá acceso a la tienda seleccionada"}
              </p>
            </div>

            {/* Select Tienda (solo si scope es 'store') */}
            {scopeType === "store" && (
              <div className="grid gap-2">
                <Label htmlFor="storeId">
                  Tienda <span className="text-red-500">*</span>
                </Label>
                {isLoadingStores ? (
                  <div className="text-sm text-muted-foreground">Cargando tiendas...</div>
                ) : (
                  <>
                    <select
                      id="storeId"
                      {...register("storeId")}
                      disabled={isLoading}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Seleccionar tienda</option>
                      {stores.map((store) => (
                        <option key={store._id} value={store._id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                    {errors.storeId && (
                      <p className="text-sm text-red-500">{errors.storeId.message}</p>
                    )}
                  </>
                )}
              </div>
            )}
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
            <Button type="submit" disabled={isLoading || isLoadingRoles || isLoadingStores}>
              {isLoading ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
