import { NewRoleModal } from '@/components/roles/NewRoleModal'
import { PageHeader } from '@/components/global/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { API_ENDPOINTS } from '@/config/api'
import axios from 'axios'
import { Shield, Users } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

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

interface Role {
  _id: string
  name: string
  modules: string[]
}

export default function Page() {
  const [roles, setRoles] = useState<Role[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editedName, setEditedName] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadRoles = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ROLES.GET_ALL)
      setRoles(response.data.roles || [])
    } catch (error) {
      console.error("Error al cargar roles:", error)
      toast.error("Error al cargar roles")
    }
  }

  const loadPages = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.PAGES.GET_ALL)
      setPages(response.data.pages || [])
    } catch (error) {
      console.error("Error al cargar páginas:", error)
      toast.error("Error al cargar páginas")
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([loadRoles(), loadPages()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
    setEditedName(role.name)
    setSelectedModules(role.modules)
  }

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handlePageToggle = (page: Page) => {
    const pageModuleIds = page.moduleDetails.map(m => m._id)
    const allSelected = pageModuleIds.every(id => selectedModules.includes(id))
    
    if (allSelected) {
      setSelectedModules(prev => prev.filter(id => !pageModuleIds.includes(id)))
    } else {
      setSelectedModules(prev => [...new Set([...prev, ...pageModuleIds])])
    }
  }

  const isPageFullySelected = (page: Page) => {
    if (page.moduleDetails.length === 0) return false
    return page.moduleDetails.every(m => selectedModules.includes(m._id))
  }

  const getModuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      read: "Mostrar",
      write: "Crear",
      update: "Actualizar",
      delete: "Eliminar"
    }
    return labels[type] || type
  }

  const handleSave = async () => {
    if (!selectedRole) return

    setSaving(true)
    try {
      await axios.put(API_ENDPOINTS.ROLES.UPDATE(selectedRole._id), {
        name: editedName,
        modules: selectedModules
      })
      toast.success("Rol actualizado exitosamente")
      await loadRoles()
      
      // Actualizar el rol seleccionado con los nuevos datos
      const updatedRole = roles.find(r => r._id === selectedRole._id)
      if (updatedRole) {
        setSelectedRole({ ...updatedRole, name: editedName, modules: selectedModules })
      }
    } catch (error) {
      console.error("Error al actualizar rol:", error)
      toast.error("Error al actualizar rol")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (roleId: string) => {
    if (!confirm("¿Estás seguro de eliminar este rol?")) return

    try {
      await axios.delete(API_ENDPOINTS.ROLES.DELETE(roleId))
      toast.success("Rol eliminado exitosamente")
      await loadRoles()
      if (selectedRole?._id === roleId) {
        setSelectedRole(null)
      }
    } catch (error) {
      console.error("Error al eliminar rol:", error)
      toast.error("Error al eliminar rol")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Gestión de Roles" }
        ]}
        title="Roles y Permisos"
        description={`Administra los roles y sus permisos del sistema. Total: ${roles.length}`}
        icon={<Shield className="h-5 w-5" />}
        actions={<NewRoleModal onSuccess={loadRoles} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de Roles */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Roles</h3>
          </div>
          
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Cargando...
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role._id}
                  onClick={() => handleRoleSelect(role)}
                  className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedRole?._id === role._id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span className="font-medium text-sm">{role.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalle del Rol */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <div className="space-y-6 border rounded-lg p-6">
              {/* Header con nombre editable */}
              <div className="flex items-center justify-between">
                <div className="flex-1 max-w-md">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-bold h-auto py-2"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>

              {/* Sub Roles */}
              <div>
                <h3 className="font-semibold mb-2">Sub Roles</h3>
                <p className="text-sm text-muted-foreground">
                  No hay sub roles configurados
                </p>
              </div>

              {/* Módulos por Página */}
              <div>
                <h3 className="font-semibold mb-4">Módulos</h3>
                <div className="space-y-4">
                  {pages.map((page) => (
                    <div key={page._id} className="bg-muted/30 rounded-lg p-4">
                      {/* Nombre de la página con checkbox para seleccionar todos */}
                      <div className="flex items-center gap-2 mb-3">
                        <Checkbox
                          id={`page-${page._id}`}
                          checked={isPageFullySelected(page)}
                          onCheckedChange={() => handlePageToggle(page)}
                          disabled={page.moduleDetails.length === 0}
                        />
                        <label
                          htmlFor={`page-${page._id}`}
                          className="text-sm font-medium text-muted-foreground cursor-pointer"
                        >
                          {page.name}
                        </label>
                      </div>

                      {/* Módulos individuales */}
                      {page.moduleDetails.length > 0 ? (
                        <div className="ml-6 space-y-2">
                          {page.moduleDetails.map((module) => (
                            <div key={module._id} className="flex items-center gap-2">
                              <Checkbox
                                id={module._id}
                                checked={selectedModules.includes(module._id)}
                                onCheckedChange={() => handleModuleToggle(module._id)}
                              />
                              <label
                                htmlFor={module._id}
                                className="text-sm cursor-pointer"
                              >
                                {getModuleTypeLabel(module.type)} {page.name}
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
              </div>

              {/* Botón de eliminar */}
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedRole._id)}
                >
                  Eliminar Rol
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Selecciona un rol
              </h3>
              <p className="text-muted-foreground">
                Selecciona un rol de la lista para ver y editar sus permisos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
