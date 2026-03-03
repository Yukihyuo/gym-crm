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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Eye, Pencil, X } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"

type SubmitHandler = (
  event: FormEvent<HTMLFormElement>
) => void | boolean | Promise<void | boolean>;

interface BaseDocumentProps {
  assignmentId: string;
  onSubmit?: SubmitHandler;
  onAssignmentUpdated?: () => void;
}

interface AssignmentData {
  _id: string;
  clientId: string | { _id: string; profile?: { names?: string; lastNames?: string }; email?: string };
  storeId: string | { _id: string; name?: string };
  planId: string | { _id: string; name?: string };
  startDate?: string;
  endDate?: string;
  pricePaid: number;
  status: 'active' | 'expired' | 'cancelled';
}

interface StoreData {
  _id: string;
  name: string;
}

interface SubscriptionData {
  _id: string;
  name: string;
}

export default function DetailsSubscriptionsAssignment({ assignmentId, onSubmit, onAssignmentUpdated }: BaseDocumentProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [clientName, setClientName] = useState("")
  const [storeId, setStoreId] = useState("")
  const [planId, setPlanId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [pricePaid, setPricePaid] = useState<number>(0)
  const [status, setStatus] = useState<'active' | 'expired' | 'cancelled'>('active')

  const [stores, setStores] = useState<StoreData[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])

  const brandId = useAuthStore((state) => state.getBrandId())
  const token = useAuthStore((state) => state.token)

  const formatDateForInput = (value?: string) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toISOString().slice(0, 10)
  }

  const extractClientName = (client: AssignmentData['clientId']) => {
    if (!client) return "N/A"
    if (typeof client === 'string') return client
    const fullName = `${client.profile?.names || ''} ${client.profile?.lastNames || ''}`.trim()
    return fullName || client.email || client._id || 'N/A'
  }

  const extractStoreId = (store: AssignmentData['storeId']) => {
    if (!store) return ""
    if (typeof store === 'string') return store
    return store._id || ""
  }

  const extractPlanId = (plan: AssignmentData['planId']) => {
    if (!plan) return ""
    if (typeof plan === 'string') return plan
    return plan._id || ""
  }

  const loadOptions = useCallback(async () => {
    if (!brandId) return

    try {
      const [storesResponse, subscriptionsResponse] = await Promise.all([
        axios.get(API_ENDPOINTS.STORES.GET_BY_BRAND(brandId), {
          headers: { Authorization: token },
        }),
        axios.get(API_ENDPOINTS.SUBSCRIPTIONS.GET_BY_BRAND(brandId), {
          headers: { Authorization: token },
        }),
      ])

      setStores(storesResponse.data?.stores || [])
      setSubscriptions(subscriptionsResponse.data?.subscriptions || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al cargar opciones:", error)
      toast.error(error.response?.data?.message || "Error al cargar catálogos")
    }
  }, [brandId, token])

  const loadAssignment = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.SUBSCRIPTIONS_ASSIGNMENTS.GET_BY_ID(assignmentId), {
        headers: { Authorization: token },
      })

      const assignment: AssignmentData = response.data.assignment
      setClientName(extractClientName(assignment.clientId))
      setStoreId(extractStoreId(assignment.storeId))
      setPlanId(extractPlanId(assignment.planId))
      setStartDate(formatDateForInput(assignment.startDate))
      setEndDate(formatDateForInput(assignment.endDate))
      setPricePaid(Number(assignment.pricePaid || 0))
      setStatus(assignment.status || 'active')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al cargar asignación:", error)
      toast.error(error.response?.data?.message || "Error al cargar asignación")
    } finally {
      setLoading(false)
    }
  }, [assignmentId, token])

  useEffect(() => {
    if (open) {
      setIsEditing(false)
      loadOptions()
      loadAssignment()
    }
  }, [open, loadOptions, loadAssignment])

  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false)
      loadAssignment()
      return
    }
    setOpen(false)
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isEditing) return;

    if (pricePaid < 0) {
      toast.error("El monto pagado no puede ser negativo")
      return
    }

    setLoading(true)
    try {
      const response = await axios.put(
        API_ENDPOINTS.SUBSCRIPTIONS_ASSIGNMENTS.UPDATE(assignmentId),
        {
          storeId,
          planId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          pricePaid: Number(pricePaid),
          status,
        },
        {
          headers: { Authorization: token },
        }
      )

      toast.success(response.data?.message || "Asignación actualizada exitosamente")
      setIsEditing(false)

      if (onAssignmentUpdated) {
        onAssignmentUpdated()
      }

      if (onSubmit) {
        await onSubmit(event)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al actualizar asignación:", error)
      toast.error(error.response?.data?.message || "Error al actualizar asignación")
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

      <DialogContent >
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle>{isEditing ? 'Editar Asignación' : 'Detalle de Asignación'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Actualiza la asignación de membresía' : 'Visualiza la asignación de membresía'}
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
                  <Label htmlFor="clientName">Cliente</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    readOnly
                    className="bg-muted cursor-default"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="storeId">Sucursal</Label>
                  <select
                    id="storeId"
                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${!isEditing ? 'bg-muted cursor-default' : ''}`}
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    disabled={!isEditing || loading}
                  >
                    <option value="">Selecciona sucursal</option>
                    {stores.map((store) => (
                      <option key={store._id} value={store._id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="planId">Membresía</Label>
                  <select
                    id="planId"
                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${!isEditing ? 'bg-muted cursor-default' : ''}`}
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    disabled={!isEditing || loading}
                  >
                    <option value="">Selecciona membresía</option>
                    {subscriptions.map((subscription) => (
                      <option key={subscription._id} value={subscription._id}>{subscription.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Fecha inicio</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      readOnly={!isEditing}
                      disabled={!isEditing || loading}
                      className={!isEditing ? 'bg-muted cursor-default' : ''}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">Fecha fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      readOnly={!isEditing}
                      disabled={!isEditing || loading}
                      className={!isEditing ? 'bg-muted cursor-default' : ''}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pricePaid">Monto pagado</Label>
                    <Input
                      id="pricePaid"
                      type="number"
                      min={0}
                      step="0.01"
                      value={pricePaid}
                      onChange={(e) => setPricePaid(Number(e.target.value))}
                      readOnly={!isEditing}
                      disabled={!isEditing || loading}
                      className={!isEditing ? 'bg-muted cursor-default' : ''}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status">Estado</Label>
                    <select
                      id="status"
                      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${!isEditing ? 'bg-muted cursor-default' : ''}`}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'active' | 'expired' | 'cancelled')}
                      disabled={!isEditing || loading}
                    >
                      <option value="active">Activa</option>
                      <option value="expired">Expirada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>
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
