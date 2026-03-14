import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { toast } from 'react-toastify'
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
import { API_ENDPOINTS } from '@/config/api'
import { useAuthStore } from '@/store/authStore'
import {
  CreateDietSchema,
  DIET_DAYS,
  DIET_MEALS,
  type CreateDietInput
} from './diets.schemas'

type Props = {
  clientId: string
  onDietCreated?: () => void
}

export default function NewClientDiet({ clientId, onDietCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const token = useAuthStore((state) => state.token)

  const emptyDay = {
    breakfast: '',
    brunch: '',
    lunch: '',
    snack: '',
    dinner: ''
  }

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<CreateDietInput>({
    resolver: zodResolver(CreateDietSchema),
    defaultValues: {
      clientId,
      title: '',
      plan: {
        Monday: { ...emptyDay },
        Tuesday: { ...emptyDay },
        Wednesday: { ...emptyDay },
        Thursday: { ...emptyDay },
        Friday: { ...emptyDay },
        Saturday: { ...emptyDay },
        Sunday: { ...emptyDay }
      }
    }
  })

  useEffect(() => {
    setValue('clientId', clientId)
  }, [clientId, setValue])

  const onSubmit = async (data: CreateDietInput) => {
    setLoading(true)
    try {
      const parsedData = CreateDietSchema.parse(data)

      const hasAnyPlanValue = Object.values(parsedData.plan ?? {}).some((dayPlan) =>
        Object.values(dayPlan ?? {}).some((mealValue) => !!mealValue)
      )

      const payload: CreateDietInput = {
        clientId: parsedData.clientId,
        title: parsedData.title,
        ...(hasAnyPlanValue ? { plan: parsedData.plan } : {})
      }

      const response = await axios.post(
        API_ENDPOINTS.DIETS.CREATE,
        payload,
        {
          headers: {
            Authorization: token
          }
        }
      )

      toast.success(response.data?.message || 'Dieta creada exitosamente')
      reset({
        clientId,
        title: '',
        plan: {
          Monday: { ...emptyDay },
          Tuesday: { ...emptyDay },
          Wednesday: { ...emptyDay },
          Thursday: { ...emptyDay },
          Friday: { ...emptyDay },
          Saturday: { ...emptyDay },
          Sunday: { ...emptyDay }
        }
      })
      setOpen(false)

      if (onDietCreated) {
        onDietCreated()
      }
    } catch (error: unknown) {
      console.error('Error al crear dieta:', error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Error al crear dieta')
      } else {
        toast.error('Error al crear dieta')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Nueva Dieta</Button>
      </DialogTrigger>

      <DialogContent className="flex h-5/6 flex-col">
        <DialogHeader>
          <DialogTitle>Nueva Dieta</DialogTitle>
          <DialogDescription>Completa la información para crear una nueva dieta</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}
          className='h-full overflow-auto'
        >
          <input type="hidden" {...register('clientId')} />

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ej: Plan Semanal Bajo Carbohidratos"
                {...register('title')}
                disabled={loading}
              />
              {errors.title && (
                <span className="text-sm text-red-500">{errors.title.message}</span>
              )}
            </div>

            <div className="grid gap-3 grid-cols-1">
              <Label>Plan semanal (opcional)</Label>
              {DIET_DAYS.map((day) => (
                <div key={day} className="rounded-md border p-3">
                  <p className="mb-2 text-sm font-medium">{day}</p>
                  <div className="grid gap-2">
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                setOpen(false)
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}