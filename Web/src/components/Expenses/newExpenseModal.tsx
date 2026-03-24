import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { HandCoins, Loader2 } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { API_ENDPOINTS } from '@/config/api'
import apiClient from '@/lib/axios'
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_SOURCE_OPTIONS,
} from '@/lib/expenses'
import { useAuthStore } from '@/store/authStore'
import { useCashCutStore } from '@/store/cashCutStore'

interface NewExpenseModalProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

const getTodayDate = () => new Date().toISOString().slice(0, 10)

export default function NewExpenseModal({ onSuccess, trigger }: NewExpenseModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>('other')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState<string>('cash_drawer')
  const [date, setDate] = useState(getTodayDate())
  const [linkToCashCut, setLinkToCashCut] = useState(false)

  const userId = useAuthStore((state) => state.getUserId())
  const brandId = useAuthStore((state) => state.getBrandId())
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())
  const cashCutId = useCashCutStore((state) => state.cashCutId)

  const canLinkCashCut = useMemo(
    () => typeof cashCutId === 'string' && cashCutId.length > 0,
    [cashCutId]
  )

  const resetForm = () => {
    setAmount('')
    setCategory('other')
    setDescription('')
    setSource('cash_drawer')
    setDate(getTodayDate())
    setLinkToCashCut(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!brandId) {
      toast.error('No se encontró la marca activa')
      return
    }

    if (!activeStoreId) {
      toast.error('No se encontró la tienda activa')
      return
    }

    if (!userId) {
      toast.error('No se encontró el usuario activo')
      return
    }

    if (!amount || Number.isNaN(Number(amount)) || Number(amount) < 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    if (linkToCashCut && !canLinkCashCut) {
      toast.error('No hay una caja abierta para vincular el gasto')
      return
    }

    setLoading(true)

    try {
      const payload = {
        userId,
        amount: Number(amount),
        category,
        description: description.trim() || undefined,
        source,
        date: date ? new Date(`${date}T12:00:00`).toISOString() : undefined,
        linkToCashCut,
        cashCutId: linkToCashCut ? cashCutId : undefined,
      }

      const response = await apiClient.post(API_ENDPOINTS.EXPENSES.CREATE, payload)

      toast.success(response.data?.message || 'Gasto creado exitosamente')
      handleOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error al crear gasto:', error)
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'message' in error.response.data
          ? String(error.response.data.message)
          : 'Error al crear gasto'

      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <HandCoins className="h-4 w-4" />
            Nuevo gasto
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
          <DialogDescription>
            Crea un nuevo gasto para la tienda activa. Si lo necesitas, puedes vincularlo al corte de caja abierto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Monto</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-date">Fecha</Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={setCategory} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origen</Label>
              <Select value={source} onValueChange={setSource} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un origen" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-description">Descripción</Label>
            <textarea
              id="expense-description"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Ej. pago de renta, compra de insumos, servicio de internet..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="rounded-md border p-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="link-to-cash-cut"
                checked={linkToCashCut}
                onCheckedChange={(checked) => setLinkToCashCut(checked === true)}
                disabled={loading || !canLinkCashCut}
              />
              <div className="space-y-1">
                <Label htmlFor="link-to-cash-cut">Vincular al corte de caja abierto</Label>
                <p className="text-sm text-muted-foreground">
                  {canLinkCashCut
                    ? 'Este gasto se asociará al corte de caja actual.'
                    : 'No hay una caja abierta disponible para vincular este gasto.'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar gasto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}