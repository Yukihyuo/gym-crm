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
import { Checkbox } from "@/components/ui/checkbox"
import { API_ENDPOINTS } from "@/config/api"


import { useAuthStore } from '@/store/authStore'
import ProtectedModule from "../global/ProtectedModule"

// Schema de validación con Zod
const roleSchema = z.object({
  name: z.string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  permissions: z.array(z.string()).default([])
})

type RoleFormValues = z.infer<typeof roleSchema>

interface Module {
  _id: string
  pageId: string
  type: "read" | "create" | "delete" | "update"
}

interface Page {
  _id: string
  name: string
  path: string
  modules: string[]
  moduleDetails: Module[]
}

interface NewRoleModalProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function NewRoleModal({ onSuccess, trigger }: NewRoleModalProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPages, setIsLoadingPages] = useState(false)
  const [pages, setPages] = useState<Page[]>([])
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  const brandId = useAuthStore((state) => state.getBrandId())

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<RoleFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(roleSchema) as any,
    defaultValues: {
      name: "",
      permissions: [],
    },
  })

  // Cargar páginas con sus módulos
  useEffect(() => {
    if (open) {
      fetchPages()
    }
  }, [open])

  const fetchPages = async () => {
    setIsLoadingPages(true)
    try {
      const response = await axios.get(API_ENDPOINTS.PAGES.GET_ALL)
      setPages(response.data.pages || [])
    } catch (error) {
      console.error("Error al cargar páginas:", error)
      toast.error("Error al cargar las páginas disponibles")
    } finally {
      setIsLoadingPages(false)
    }
  }

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules((prev) => {
      const newModules = prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId]

      setValue("permissions", newModules)
      return newModules
    })
  }

  const handlePageToggle = (page: Page) => {
    const pageModuleIds = page.moduleDetails.map(m => m._id)
    const allSelected = pageModuleIds.every(id => selectedModules.includes(id))

    if (allSelected) {
      // Deseleccionar todos los módulos de esta página
      setSelectedModules(prev => {
        const newModules = prev.filter(id => !pageModuleIds.includes(id))
        setValue("permissions", newModules)
        return newModules
      })
    } else {
      // Seleccionar todos los módulos de esta página
      setSelectedModules(prev => {
        const newModules = [...new Set([...prev, ...pageModuleIds])]
        setValue("permissions", newModules)
        return newModules
      })
    }
  }

  const isPageFullySelected = (page: Page) => {
    if (page.moduleDetails.length === 0) return false
    return page.moduleDetails.every(m => selectedModules.includes(m._id))
  }

  const isPagePartiallySelected = (page: Page) => {
    if (page.moduleDetails.length === 0) return false
    const selected = page.moduleDetails.some(m => selectedModules.includes(m._id))
    return selected && !isPageFullySelected(page)
  }

  const getModuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      read: "Lectura",
      write: "Escritura",
      update: "Actualización",
      delete: "Eliminación"
    }
    return labels[type] || type
  }

  const onSubmit = async (data: RoleFormValues) => {
    setIsLoading(true)
    try {
      const response = await axios.post(API_ENDPOINTS.ROLES.CREATE, {
        brandId,
        name: data.name,
        permissions: data.permissions,
      })

      toast.success(response.data.message || "Rol creado exitosamente")

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
        const message = error.response?.data?.message || "Error al crear rol"
        toast.error(message)
      } else {
        toast.error("Error inesperado al crear rol")
      }
      console.error("Error al crear rol:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
      setSelectedModules([])
      setPages([])
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <ProtectedModule page="Roles" type="create" method="hide">
        <DialogTrigger asChild>
          {trigger || <Button>Nuevo Rol</Button>}
        </DialogTrigger>
      </ProtectedModule>

      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Rol</DialogTitle>
          <DialogDescription>
            Completa los datos para crear un nuevo rol y asigna los permisos correspondientes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Campo Nombre */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nombre del Rol <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Administrador"
                {...register("name")}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Módulos por Página */}
            <div className="grid gap-2">
              <Label>Permisos por Página</Label>
              <p className="text-xs text-muted-foreground">
                Selecciona los permisos que tendrá este rol en cada página
              </p>

              {isLoadingPages ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Cargando páginas...
                </div>
              ) : pages.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No hay páginas disponibles
                </div>
              ) : (
                <div className="space-y-4 border rounded-lg p-4">
                  {pages.map((page) => (
                    <div key={page._id} className="space-y-2">
                      {/* Checkbox para toda la página */}
                      <div className="flex items-center space-x-2 font-medium">
                        <Checkbox
                          id={`page-${page._id}`}
                          checked={isPageFullySelected(page)}
                          onCheckedChange={() => handlePageToggle(page)}
                          disabled={isLoading || page.moduleDetails.length === 0}
                          className={isPagePartiallySelected(page) ? "opacity-50" : ""}
                        />
                        <label
                          htmlFor={`page-${page._id}`}
                          className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {page.name} <span className="text-muted-foreground font-normal">({page.path})</span>
                        </label>
                      </div>

                      {/* Checkboxes individuales por módulo */}
                      {page.moduleDetails.length > 0 ? (
                        <div className="ml-6 grid grid-cols-2 gap-2">
                          {page.moduleDetails.map((module) => (
                            <div key={module._id} className="flex items-center space-x-2">
                              <Checkbox
                                id={module._id}
                                checked={selectedModules.includes(module._id)}
                                onCheckedChange={() => handleModuleToggle(module._id)}
                                disabled={isLoading}
                              />
                              <label
                                htmlFor={module._id}
                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {getModuleTypeLabel(module.type)}
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="ml-6 text-xs text-muted-foreground italic">
                          Sin módulos disponibles
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedModules.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedModules.length} permiso(s) seleccionado(s)
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
            <Button type="submit" disabled={isLoading || isLoadingPages}>
              {isLoading ? "Creando..." : "Crear Rol"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog >
  )
}
