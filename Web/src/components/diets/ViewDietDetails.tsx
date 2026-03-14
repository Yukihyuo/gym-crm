import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Trash2, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { API_ENDPOINTS } from '@/config/api'
import { useAuthStore } from '@/store/authStore'
import { UpdateDietSchema, DIET_DAYS, DIET_MEALS, type UpdateDietInput, type Diet } from './diets.schemas'

type Props = {
  clientId: string
  dietId: string
  initialTitle?: string
  initialCreatedAt?: string
  onDietUpdated?: () => void
  onDietDeleted?: () => void
}

export default function ViewDietDetails({
  clientId,
  dietId,
  initialTitle,
  initialCreatedAt,
  onDietUpdated,
  onDietDeleted
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [diet, setDiet] = useState<Diet | null>(null)
  const token = useAuthStore((state) => state.token)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<UpdateDietInput>({
    resolver: zodResolver(UpdateDietSchema),
    defaultValues: {
      title: ''
    }
  })

  const loadDietData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(
        API_ENDPOINTS.DIETS.GET_BY_ID(clientId, dietId),
        {
          headers: {
            Authorization: token
          }
        }
      )

      const dietData: Diet = response.data.diet
      setDiet(dietData)
      reset({
        title: dietData.title,
        plan: Object.fromEntries(
          DIET_DAYS.map((day) => [
            day,
            {
              breakfast: dietData.plan?.[day]?.breakfast ?? '',
              brunch:    dietData.plan?.[day]?.brunch    ?? '',
              lunch:     dietData.plan?.[day]?.lunch     ?? '',
              snack:     dietData.plan?.[day]?.snack     ?? '',
              dinner:    dietData.plan?.[day]?.dinner    ?? ''
            }
          ])
        ) as UpdateDietInput['plan']
      })
    } catch (error: unknown) {
      console.error('Error al cargar dieta:', error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Error al cargar dieta')
      } else {
        toast.error('Error al cargar dieta')
      }
    } finally {
      setLoading(false)
    }
  }, [clientId, dietId, token, reset])

  useEffect(() => {
    if (open && !diet) {
      loadDietData()
    }
  }, [open, diet, loadDietData])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false)
      if (diet) {
        reset({
          title: diet.title,
          plan: Object.fromEntries(
            DIET_DAYS.map((day) => [
              day,
              {
                breakfast: diet.plan?.[day]?.breakfast ?? '',
                brunch:    diet.plan?.[day]?.brunch    ?? '',
                lunch:     diet.plan?.[day]?.lunch     ?? '',
                snack:     diet.plan?.[day]?.snack     ?? '',
                dinner:    diet.plan?.[day]?.dinner    ?? ''
              }
            ])
          ) as UpdateDietInput['plan']
        })
      }
      return
    }
    setOpen(false)
  }

  const onSubmit = async (data: UpdateDietInput) => {
    setLoading(true)
    try {
      const response = await axios.put(
        API_ENDPOINTS.DIETS.UPDATE(clientId, dietId),
        data,
        {
          headers: {
            Authorization: token
          }
        }
      )

      const updatedDiet: Diet = response.data.diet
      setDiet(updatedDiet)
      reset({ title: updatedDiet.title })
      setIsEditing(false)
      toast.success(response.data?.message || 'Dieta actualizada exitosamente')

      if (onDietUpdated) {
        onDietUpdated()
      }
    } catch (error: unknown) {
      console.error('Error al actualizar dieta:', error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Error al actualizar dieta')
      } else {
        toast.error('Error al actualizar dieta')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await axios.delete(
        API_ENDPOINTS.DIETS.DELETE(clientId, dietId),
        {
          headers: {
            Authorization: token
          }
        }
      )

      toast.success(response.data?.message || 'Dieta eliminada exitosamente')
      setShowDeleteConfirm(false)
      setOpen(false)

      if (onDietDeleted) {
        onDietDeleted()
      }
    } catch (error: unknown) {
      console.error('Error al eliminar dieta:', error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Error al eliminar dieta')
      } else {
        toast.error('Error al eliminar dieta')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Card className="cursor-pointer transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">{diet?.title || initialTitle || 'Dieta'}</CardTitle>
              <CardDescription className='text-right' >
                {(diet?.createdAt || initialCreatedAt)
                  ? new Date(diet?.createdAt || initialCreatedAt || '').toLocaleDateString()
                  : 'Sin fecha'}
              </CardDescription>
            </CardHeader>
          </Card>
        </DialogTrigger>

        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <DialogTitle>{isEditing ? 'Editar Dieta' : 'Detalles de Dieta'}</DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Actualiza la información de la dieta' : 'Visualiza la información de la dieta'}
                </DialogDescription>
              </div>
              {!isEditing && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEdit}
                    disabled={loading}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {diet && (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título {isEditing ? '*' : ''}</Label>
                  {isEditing ? (
                    <>
                      <Input
                        id="title"
                        placeholder="Ej: Plan Semanal"
                        {...register('title')}
                        disabled={loading}
                      />
                      {errors.title && (
                        <span className="text-sm text-red-500">{errors.title.message}</span>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-700">{diet.title}</p>
                  )}
                </div>

                {!isEditing && diet.createdAt && (
                  <div className="grid gap-2">
                    <Label className="text-xs text-gray-500">Creada:</Label>
                    <p className="text-sm text-gray-700">
                      {new Date(diet.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {!isEditing && diet.updatedAt && (
                  <div className="grid gap-2">
                    <Label className="text-xs text-gray-500">Última actualización:</Label>
                    <p className="text-sm text-gray-700">
                      {new Date(diet.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Plan semanal - Vista lectura */}
                {!isEditing && (
                  <div className="grid gap-3">
                    <Label className="text-xs text-gray-500">Plan semanal:</Label>
                    {DIET_DAYS.some((day) =>
                      DIET_MEALS.some((meal) => !!diet.plan?.[day]?.[meal])
                    ) ? (
                      DIET_DAYS.map((day) => {
                        const dayPlan = diet.plan?.[day]
                        const hasMeals = dayPlan && DIET_MEALS.some((meal) => !!dayPlan[meal])
                        if (!hasMeals) return null
                        return (
                          <div key={day} className="rounded-md border p-3">
                            <p className="mb-2 text-sm font-semibold">{day}</p>
                            <div className="grid grid-cols-2 gap-1 text-sm">
                              {DIET_MEALS.map((meal) => {
                                const value = dayPlan[meal]
                                if (!value) return null
                                return (
                                  <div key={meal} className="flex gap-1">
                                    <span className="capitalize text-gray-500">{meal}:</span>
                                    <span className="text-gray-800">{value}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-gray-400">Sin plan asignado</p>
                    )}
                  </div>
                )}

                {/* Plan semanal - Modo edición */}
                {isEditing && (
                  <div className="grid gap-3">
                    <Label>Plan semanal (opcional)</Label>
                    {DIET_DAYS.map((day) => (
                      <div key={day} className="rounded-md border p-3">
                        <p className="mb-2 text-sm font-medium">{day}</p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {DIET_MEALS.map((meal) => (
                            <div key={`${day}-${meal}`} className="grid gap-1">
                              <Label htmlFor={`${day}-${meal}`} className="text-xs capitalize">
                                {meal}
                              </Label>
                              <Input
                                id={`${day}-${meal}`}
                                placeholder={`Ej: ${meal}`}
                                {...register(`plan.${day}.${meal}`)}
                                disabled={loading}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  {isEditing ? 'Cancelar edición' : 'Cerrar'}
                </Button>
                {isEditing && (
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar'}
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar dieta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la dieta "{diet?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}