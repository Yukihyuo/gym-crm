import { useState, useEffect } from "react"
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
import { X } from "lucide-react"

// Schema de validación con Zod
const pageSchema = z.object({
  name: z.string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  path: z.string()
    .min(1, "La ruta es requerida")
    .regex(/^\/[a-zA-Z0-9\-_/]*$/, "La ruta debe comenzar con / y contener solo letras, números, guiones y barras"),
})

type PageFormValues = z.infer<typeof pageSchema>

interface Module {
  _id: string
  pageId: string
  type: "read" | "write" | "delete" | "update"
}

interface Page {
  _id: string
  name: string
  path: string
  modules: string[]
  moduleDetails: Module[]
}

interface EditPageModalProps {
  page: Page
  onSuccess?: () => void
  trigger?: React.ReactNode
}

const MODULE_OPTIONS = [
  { value: "read", label: "Lectura (Read)" },
  { value: "write", label: "Escritura (Write)" },
  { value: "update", label: "Actualización (Update)" },
  { value: "delete", label: "Eliminación (Delete)" },
] as const

export function EditPageModal({ page, onSuccess, trigger }: EditPageModalProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [modules, setModules] = useState<Module[]>(page.moduleDetails || [])
  const [newModuleType, setNewModuleType] = useState<string>("")

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PageFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pageSchema) as any,
    defaultValues: {
      name: page.name,
      path: page.path,
    },
  })

  useEffect(() => {
    if (open) {
      setModules(page.moduleDetails || [])
      reset({
        name: page.name,
        path: page.path,
      })
    }
  }, [open, page])

  const getModuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      read: "Lectura",
      write: "Escritura",
      update: "Actualización",
      delete: "Eliminación"
    }
    return labels[type] || type
  }

  const handleAddModule = async () => {
    if (!newModuleType) {
      toast.error("Selecciona un tipo de módulo")
      return
    }

    // Verificar si ya existe ese tipo de módulo
    if (modules.some(m => m.type === newModuleType)) {
      toast.error(`Ya existe un módulo de tipo '${getModuleTypeLabel(newModuleType)}'`)
      return
    }

    try {
      const response = await axios.post(API_ENDPOINTS.PAGES.ADD_MODULES(page._id), {
        moduleTypes: [newModuleType]
      })

      const updatedPage = response.data.page
      setModules(updatedPage.moduleDetails || [])
      setNewModuleType("")
      toast.success("Módulo agregado exitosamente")
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Error al agregar módulo")
      } else {
        toast.error("Error inesperado al agregar módulo")
      }
      console.error("Error al agregar módulo:", error)
    }
  }

  const handleRemoveModule = async (moduleId: string) => {
    try {
      await axios.delete(API_ENDPOINTS.PAGES.REMOVE_MODULE(page._id, moduleId))
      setModules(prev => prev.filter(m => m._id !== moduleId))
      toast.success("Módulo eliminado exitosamente")
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Error al eliminar módulo")
      } else {
        toast.error("Error inesperado al eliminar módulo")
      }
      console.error("Error al eliminar módulo:", error)
    }
  }

  const onSubmit = async (data: PageFormValues) => {
    setIsLoading(true)
    try {
      await axios.put(API_ENDPOINTS.PAGES.UPDATE(page._id), {
        name: data.name,
        path: data.path,
      })

      toast.success("Página actualizada exitosamente")
      
      setOpen(false)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Error al actualizar página"
        toast.error(message)
      } else {
        toast.error("Error inesperado al actualizar página")
      }
      console.error("Error al actualizar página:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
      setModules(page.moduleDetails || [])
      setNewModuleType("")
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Editar</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-175">
        <DialogHeader>
          <DialogTitle>Actualizar página</DialogTitle>
          <DialogDescription>
            Modifica la información de la página y gestiona sus módulos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 py-4">
            {/* Campos de la página */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Addresses"
                  {...register("name")}
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="path">Ruta</Label>
                <Input
                  id="path"
                  placeholder="addresses"
                  {...register("path")}
                  disabled={isLoading}
                />
                {errors.path && (
                  <p className="text-sm text-red-500">{errors.path.message}</p>
                )}
              </div>
            </div>

            {/* Sección de módulos */}
            <div className="space-y-4">
              <Label className="text-base">Módulos</Label>
              
              {/* Agregar nuevo módulo */}
              <div className="flex gap-2">
                <select
                  value={newModuleType}
                  onChange={(e) => setNewModuleType(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Seleccionar tipo</option>
                  {MODULE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={handleAddModule}
                  disabled={isLoading || !newModuleType}
                  className="whitespace-nowrap"
                >
                  + Agregar
                </Button>
              </div>

              {/* Tabla de módulos */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium">
                        Nombre
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium">
                        Descripción
                      </th>
                      <th className="text-center px-4 py-3 text-sm font-medium w-24">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-8 text-muted-foreground">
                          No hay módulos agregados
                        </td>
                      </tr>
                    ) : (
                      modules.map((module) => (
                        <tr key={module._id} className="border-t">
                          <td className="px-4 py-3 text-sm">{module.type}</td>
                          <td className="px-4 py-3 text-sm">
                            {getModuleTypeLabel(module.type)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveModule(module._id)}
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cerrar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
