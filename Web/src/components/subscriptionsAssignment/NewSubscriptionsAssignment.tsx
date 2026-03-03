import { type FormEvent, useState } from "react";
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
import { Label } from "@/components/ui/label";
import axios from "axios";
import { toast } from "react-toastify";
import { useCallback, useEffect } from "react";
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"

type SubmitHandler = (
  event: FormEvent<HTMLFormElement>
) => void | boolean | Promise<void | boolean>;

interface BaseDocumentProps {
  onSubmit?: SubmitHandler;
  onAssignmentCreated?: () => void;
}

interface ClientData {
  _id: string;
  profile?: {
    names?: string;
    lastNames?: string;
  };
  email?: string;
}

interface SubscriptionData {
  _id: string;
  name: string;
  description?: string;
  duration?: {
    value?: number;
    unit?: 'days' | 'weeks' | 'months' | 'years';
  };
  price?: {
    amount?: number;
    currency?: string;
  };
  benefits?: Array<{
    name?: string;
    included?: boolean;
    limit?: number;
  }>;
  status: 'active' | 'inactive' | 'archived';
}

const formatDuration = (duration?: SubscriptionData['duration']) => {
  const value = Number(duration?.value || 0)
  const unit = duration?.unit || 'months'

  if (!value) return 'Duración no definida'

  const labels: Record<'days' | 'weeks' | 'months' | 'years', string> = {
    days: 'día(s)',
    weeks: 'semana(s)',
    months: 'mes(es)',
    years: 'año(s)'
  }

  return `${value} ${labels[unit]}`
}

const formatCurrency = (price?: SubscriptionData['price']) => {
  const amount = Number(price?.amount || 0)
  const currency = price?.currency || 'MXN'

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount)
}

export default function NewSubscriptionsAssignment({ onSubmit, onAssignmentCreated }: BaseDocumentProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<ClientData[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])

  const [clientId, setClientId] = useState("")
  const [planId, setPlanId] = useState("")

  const brandId = useAuthStore((state) => state.getBrandId())
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())
  const token = useAuthStore((state) => state.token)

  const loadOptions = useCallback(async () => {
    if (!brandId) return;

    try {
      const [clientsResponse, subscriptionsResponse] = await Promise.all([
        axios.get(API_ENDPOINTS.CLIENTS.GET_BY_BRAND(brandId), {
          headers: { Authorization: token },
        }),
        axios.get(API_ENDPOINTS.SUBSCRIPTIONS.GET_BY_BRAND(brandId), {
          headers: { Authorization: token },
        })
      ])

      setClients(clientsResponse.data?.clients || [])
      setSubscriptions((subscriptionsResponse.data?.subscriptions || []).filter((item: SubscriptionData) => item.status === 'active'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al cargar opciones:", error)
      toast.error(error.response?.data?.message || "Error al cargar clientes o membresías")
    }
  }, [brandId, token])

  useEffect(() => {
    if (open) {
      loadOptions()
    }
  }, [open, loadOptions])

  const resetForm = () => {
    setClientId("")
    setPlanId("")
  }

  const handleCancel = () => {
    resetForm()
    setOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeStoreId) {
      toast.error("No se encontró una sucursal activa")
      return
    }

    if (!clientId || !planId) {
      toast.error("Debes seleccionar cliente y membresía")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(
        API_ENDPOINTS.SUBSCRIPTIONS_ASSIGNMENTS.CREATE,
        {
          clientId,
          storeId: activeStoreId,
          planId,
        },
        {
          headers: {
            Authorization: token,
          },
        }
      )

      toast.success(response.data?.message || "Suscripción asignada exitosamente")

      if (onAssignmentCreated) {
        onAssignmentCreated()
      }

      if (onSubmit) {
        const shouldClose = await onSubmit(event);
        if (shouldClose === false) {
          setLoading(false)
          return
        }
      }

      resetForm()
      setOpen(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al asignar suscripción:", error)
      toast.error(error.response?.data?.message || "Error al asignar suscripción")
    } finally {
      setLoading(false)
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Asignar Membresía</Button>
      </DialogTrigger>

      <DialogContent >
        <DialogHeader>
          <DialogTitle>Nueva Asignación de Membresía</DialogTitle>
          <DialogDescription>Selecciona cliente y membresía para crear la asignación</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="clientId">Cliente *</Label>
              <select
                id="clientId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={loading}
              >
                <option value="">Selecciona un cliente</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {(client.profile?.names || '') + ' ' + (client.profile?.lastNames || '')} {client.email ? `- ${client.email}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="planId">Membresía *</Label>
              {subscriptions.length === 0 ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  No hay membresías activas disponibles.
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {subscriptions.map((subscription) => {
                    const isSelected = planId === subscription._id
                    const benefits = (subscription.benefits || []).filter((item) => item.included !== false)

                    return (
                      <button
                        key={subscription._id}
                        type="button"
                        onClick={() => setPlanId(subscription._id)}
                        className={`w-full rounded-md border p-3 text-left transition-colors ${isSelected
                          ? 'border-primary bg-muted'
                          : 'border-border hover:bg-muted/40'
                          }`}
                        disabled={loading}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{subscription.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {subscription.description || 'Sin descripción'}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatCurrency(subscription.price)}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-muted-foreground">
                          Duración: {formatDuration(subscription.duration)}
                        </div>

                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground">Beneficios</p>
                          {benefits.length > 0 ? (
                            <ul className="mt-1 list-disc pl-5 text-sm">
                              {benefits.slice(0, 4).map((benefit, index) => (
                                <li key={`${subscription._id}-${index}`}>
                                  {benefit.name || 'Beneficio incluido'}
                                </li>
                              ))}
                              {benefits.length > 4 ? (
                                <li className="text-muted-foreground">+{benefits.length - 4} beneficio(s) más</li>
                              ) : null}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">Sin beneficios definidos</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>


          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
