import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Loader2, Salad } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import ViewDietDetails from '@/components/diets/ViewDietDetails'
import { type DietListItem } from '@/components/diets/diets.schemas'

export default function Diets() {
  const apiUrl = import.meta.env.VITE_API_URL
  const user = useUserStore((state) => state.user)
  const token = useUserStore((state) => state.token)
  const clientId = user?.id

  const [diets, setDiets] = useState<DietListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDiets = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(
        `${apiUrl}v1/diets/${clientId}/getAll`,
        {
          headers: { Authorization: token }
        }
      )
      setDiets(response.data.diets || [])
    } catch (err) {
      console.error('Error al cargar dietas:', err)
      setError('No se pudieron cargar tus dietas. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, clientId, token])

  useEffect(() => {
    loadDiets()
  }, [loadDiets])

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-2">
        <Salad className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Mis Dietas</h1>
      </div>

      {!clientId && (
        <p className="text-muted-foreground">No se encontró tu sesión. Por favor inicia sesión de nuevo.</p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={loadDiets}
            className="mt-2 text-sm underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && diets.length === 0 && clientId && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Salad className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No tienes dietas asignadas aún.</p>
        </div>
      )}

      {!loading && diets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {diets.map((diet) => (
            <ViewDietDetails
              key={diet._id}
              clientId={clientId!}
              dietId={diet._id}
              initialTitle={diet.title}
              initialCreatedAt={diet.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  )
}