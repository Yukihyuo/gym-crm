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
import { Checkbox } from "@/components/ui/checkbox"
import { API_ENDPOINTS } from "@/config/api"

// Schema de validación con Zod
const pageSchema = z.object({
  name: z.string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  path: z.string()
    .min(1, "La ruta es requerida")
    .regex(/^\/[a-zA-Z0-9\-_/]*$/, "La ruta debe comenzar con / y contener solo letras, números, guiones y barras"),
  moduleTypes: z.array(z.enum(["read", "create", "delete", "update"])).default([])
})

type PageFormValues = z.infer<typeof pageSchema>

const MODULE_OPTIONS = [
  { value: "read", label: "Lectura (Read)" },
  { value: "create", label: "Escritura (Create)" },
  { value: "update", label: "Actualización (Update)" },
  { value: "delete", label: "Eliminación (Delete)" },
] as const

interface NewPageModalProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function NewPageModal({ onSuccess, trigger }: NewPageModalProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema) as any,
    defaultValues: {
      name: "",
      path: "",
      moduleTypes: [],
    },
  })

  const handleModuleToggle = (moduleValue: string) => {
    setSelectedModules((prev) => {
      const newModules = prev.includes(moduleValue)
        ? prev.filter((m) => m !== moduleValue)
        : [...prev, moduleValue]
      
      setValue("moduleTypes", newModules as ("read" | "create" | "delete" | "update")[])
      return newModules
    })
  }

  const onSubmit = async (data: PageFormValues) => {
    setIsLoading(true)
    console.log(API_ENDPOINTS.PAGES.CREATE)
    try {
      const response = await axios.post(API_ENDPOINTS.PAGES.CREATE, {
        name: data.name,
        path: data.path,
        moduleTypes: data.moduleTypes,
      })

      toast.success(response.data.message || "Página creada exitosamente")
      
      // Reset form y cerrar modal
      reset()
      setSelectedModules([])
      setOpen(false)
      
      // Callback de éxito
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Error al crear página"
        toast.error(message)
      } else {
        toast.error("Error inesperado al crear página")
      }
      console.error("Error al crear página:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
      setSelectedModules([])
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button>Nueva Página</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Crear Nueva Página</DialogTitle>
          <DialogDescription>
            Completa los datos para crear una nueva página en el sistema. Los módulos son opcionales.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            {/* Campo Nombre */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Dashboard"
                {...register("name")}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Campo Ruta */}
            <div className="grid gap-2">
              <Label htmlFor="path">
                Ruta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="path"
                placeholder="/dashboard"
                {...register("path")}
                disabled={isLoading}
              />
              {errors.path && (
                <p className="text-sm text-red-500">{errors.path.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                La ruta debe comenzar con / (ejemplo: /dashboard, /users)
              </p>
            </div>

            {/* Módulos */}
            <div className="grid gap-2">
              <Label>Módulos (Permisos)</Label>
              <div className="grid grid-cols-2 gap-3">
                {MODULE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={selectedModules.includes(option.value)}
                      onCheckedChange={() => handleModuleToggle(option.value)}
                      disabled={isLoading}
                    />
                    <label
                      htmlFor={option.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecciona los permisos que tendrá esta página
              </p>
            </div>
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
              {isLoading ? "Creando..." : "Crear Página"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
