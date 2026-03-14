import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DIET_DAYS, DIET_MEALS, type Diet } from './diets.schemas'

type Props = {
  clientId: string
  dietId: string
  initialTitle?: string
  initialCreatedAt?: string
}

export default function ViewDietDetails({ clientId, dietId, initialTitle, initialCreatedAt }: Props) {
  const apiUrl = import.meta.env.VITE_API_URL
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [diet, setDiet] = useState<Diet | null>(null)

  const loadDiet = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(
        `${apiUrl}v1/diets/${clientId}/getById/${dietId}`
      )
      setDiet(response.data.diet)
    } catch (error) {
      console.error('Error al cargar dieta:', error)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, clientId, dietId])

  useEffect(() => {
    if (open && !diet) {
      loadDiet()
    }
  }, [open, diet, loadDiet])

  const displayTitle = diet?.title || initialTitle || 'Dieta'
  const displayDate = diet?.createdAt || initialCreatedAt

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-foreground">{displayTitle}</p>
            {displayDate && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(displayDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Toca para ver detalles</p>
        </div>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{diet?.title || displayTitle}</DialogTitle>
          <DialogDescription>
            {diet?.createdAt
              ? `Creada el ${new Date(diet.createdAt).toLocaleDateString()}`
              : 'Cargando...'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && diet && (
          <div className="grid gap-4">
            {/* Metadatos */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Creada</p>
                <p>{new Date(diet.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actualizada</p>
                <p>{new Date(diet.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Plan semanal */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan semanal</p>
              {DIET_DAYS.some((day) =>
                DIET_MEALS.some((meal) => !!diet.plan?.[day]?.[meal])
              ) ? (
                <div className="grid gap-3">
                  {DIET_DAYS.map((day) => {
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
                                <span className="capitalize text-muted-foreground">{meal}:</span>
                                <span>{value}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin plan asignado</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}