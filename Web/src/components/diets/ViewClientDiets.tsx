import { useEffect, useState, useCallback } from 'react'
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
import { DropdownMenuItem } from '../ui/dropdown-menu'
import { Eye, Loader2 } from 'lucide-react'
import { API_ENDPOINTS } from '@/config/api'
import { useAuthStore } from '@/store/authStore'
import ViewDietDetails from './ViewDietDetails'
import NewClientDiet from './NewClientDiet'
import { type DietListItem } from './diets.schemas'

type Props = {
  clientId: string
  onClose?: () => void
}

export default function ViewClientDiets({ clientId, onClose }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [diets, setDiets] = useState<DietListItem[]>([])
  const token = useAuthStore((state) => state.token)

  const loadDiets = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(
        API_ENDPOINTS.DIETS.GET_ALL(clientId),
        {
          headers: {
            Authorization: token
          }
        }
      )

      setDiets(response.data.diets || [])
    } catch (error: unknown) {
      console.error('Error al cargar dietas:', error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Error al cargar dietas')
      } else {
        toast.error('Error al cargar dietas')
      }
    } finally {
      setLoading(false)
    }
  }, [clientId, token])

  useEffect(() => {
    if (open) {
      loadDiets()
    }
  }, [open, loadDiets])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen && onClose) {
      onClose()
    }
  }

  const handleDietCreated = () => {
    loadDiets()
  }

  const handleDietUpdated = () => {
    loadDiets()
  }

  const handleDietDeleted = () => {
    loadDiets()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            setOpen(true)
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver dietas
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dietas del Cliente</DialogTitle>
          <DialogDescription>
            {diets.length > 0
              ? `${diets.length} dieta${diets.length !== 1 ? 's' : ''} registrada${diets.length !== 1 ? 's' : ''}`
              : 'No hay dietas registradas'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <NewClientDiet clientId={clientId} onDietCreated={handleDietCreated} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : diets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">No hay dietas registradas para este cliente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {diets.map((diet) => (
                <ViewDietDetails
                  key={diet._id}
                  clientId={clientId}
                  dietId={diet._id}
                  initialTitle={diet.title}
                  initialCreatedAt={diet.createdAt}
                  onDietUpdated={handleDietUpdated}
                  onDietDeleted={handleDietDeleted}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant="outline">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}