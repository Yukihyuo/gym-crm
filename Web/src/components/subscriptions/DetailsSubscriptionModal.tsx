import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import axios from "axios";
import { toast } from "react-toastify";
import { Eye, Pencil, X } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"

type SubmitHandler = (
  event: FormEvent<HTMLFormElement>
) => void | boolean | Promise<void | boolean>;

interface BaseDocumentProps {
  subscriptionId: string;
  onSubmit?: SubmitHandler;
  onSubscriptionUpdated?: () => void;
}

interface SubscriptionData {
  _id: string
  name: string
  description?: string
  duration: {
    value: number
    unit: 'days' | 'weeks' | 'months' | 'years'
  }
  price: {
    amount: number
    currency: string
  }
  status: 'active' | 'inactive' | 'archived'
  benefits?: Array<{ name?: string }>
}

export default function DetailsSubscriptionModal({ subscriptionId, onSubmit, onSubscriptionUpdated }: BaseDocumentProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [durationValue, setDurationValue] = useState<number>(1)
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('months')
  const [amount, setAmount] = useState<number>(0)
  const [currency, setCurrency] = useState("MXN")
  const [status, setStatus] = useState<'active' | 'inactive' | 'archived'>('active')
  const [benefitsText, setBenefitsText] = useState("")

  const token = useAuthStore((state) => state.token)

  const loadSubscriptionData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.SUBSCRIPTIONS.GET_BY_ID(subscriptionId), {
        headers: {
          Authorization: token,
        },
      })

      const subscription: SubscriptionData = response.data.subscription
      setName(subscription.name || "")
      setDescription(subscription.description || "")
      setDurationValue(subscription.duration?.value || 1)
      setDurationUnit(subscription.duration?.unit || 'months')
      setAmount(subscription.price?.amount || 0)
      setCurrency(subscription.price?.currency || 'MXN')
      setStatus(subscription.status || 'active')
      setBenefitsText((subscription.benefits || []).map((item) => item.name || '').filter(Boolean).join("\n"))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al cargar membresía:", error)
      toast.error(error.response?.data?.message || "Error al cargar membresía")
    } finally {
      setLoading(false)
    }
  }, [subscriptionId, token])

  useEffect(() => {
    if (open) {
      setIsEditing(false)
      loadSubscriptionData()
    }
  }, [open, loadSubscriptionData])

  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false)
      loadSubscriptionData()
      return
    }
    setOpen(false)
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isEditing) return;

    if (!name.trim()) {
      toast.error("El nombre de la membresía es requerido");
      return;
    }

    if (durationValue <= 0) {
      toast.error("La duración debe ser mayor a 0");
      return;
    }

    if (amount < 0) {
      toast.error("El precio no puede ser negativo");
      return;
    }

    const benefits = benefitsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({ name: item, included: true }));

    setLoading(true)
    try {
      const response = await axios.put(
        API_ENDPOINTS.SUBSCRIPTIONS.UPDATE(subscriptionId),
        {
          name: name.trim(),
          description: description.trim() || undefined,
          duration: {
            value: Number(durationValue),
            unit: durationUnit,
          },
          price: {
            amount: Number(amount),
            currency: currency.trim() || 'MXN',
          },
          benefits,
          status,
        },
        {
          headers: {
            Authorization: token,
          },
        }
      )

      toast.success(response.data?.message || "Membresía actualizada exitosamente")
      setIsEditing(false)

      if (onSubscriptionUpdated) {
        onSubscriptionUpdated()
      }

      if (onSubmit) {
        await onSubmit(event)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al actualizar membresía:", error)
      toast.error(error.response?.data?.message || "Error al actualizar membresía")
    } finally {
      setLoading(false)
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            setOpen(true)
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle>{isEditing ? 'Editar Membresía' : 'Detalles de Membresía'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Actualiza la información de la membresía' : 'Visualiza la información de la membresía'}
              </DialogDescription>
            </div>
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={loading}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando información...</p>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    readOnly={!isEditing}
                    disabled={loading}
                    className={!isEditing ? 'bg-muted cursor-default' : ''}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    readOnly={!isEditing}
                    disabled={loading}
                    className={!isEditing ? 'bg-muted cursor-default' : ''}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="durationValue">Duración</Label>
                    <Input
                      id="durationValue"
                      type="number"
                      min={1}
                      value={durationValue}
                      onChange={(e) => setDurationValue(Number(e.target.value))}
                      readOnly={!isEditing}
                      disabled={loading}
                      className={!isEditing ? 'bg-muted cursor-default' : ''}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="durationUnit">Unidad</Label>
                    <select
                      id="durationUnit"
                      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${!isEditing ? 'bg-muted cursor-default' : ''}`}
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value as 'days' | 'weeks' | 'months' | 'years')}
                      disabled={!isEditing || loading}
                    >
                      <option value="days">Días</option>
                      <option value="weeks">Semanas</option>
                      <option value="months">Meses</option>
                      <option value="years">Años</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Precio</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={0}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      readOnly={!isEditing}
                      disabled={loading}
                      className={!isEditing ? 'bg-muted cursor-default' : ''}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Input
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      readOnly={!isEditing}
                      disabled={loading}
                      className={!isEditing ? 'bg-muted cursor-default' : ''}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="benefits">Beneficios (uno por línea)</Label>
                  <textarea
                    id="benefits"
                    className={`flex min-h-22.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${!isEditing ? 'bg-muted cursor-default' : ''}`}
                    value={benefitsText}
                    onChange={(e) => setBenefitsText(e.target.value)}
                    readOnly={!isEditing}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Estado</Label>
                  <select
                    id="status"
                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${!isEditing ? 'bg-muted cursor-default' : ''}`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'archived')}
                    disabled={!isEditing || loading}
                  >
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                    <option value="archived">Archivada</option>
                  </select>
                </div>
              </>
            )}


          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              {isEditing ? <X className="mr-1 h-4 w-4" /> : null}
              {isEditing ? 'Cancelar' : 'Cerrar'}
            </Button>

            {isEditing && (
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
