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
import { Check, ChevronsUpDown } from "lucide-react"
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type SubmitHandler = (
  event: FormEvent<HTMLFormElement>
) => void | boolean | Promise<void | boolean>;

interface BaseDocumentProps {
  onSubmit?: SubmitHandler;
  onAssignmentCreated?: () => void;
}

interface ClientData {
  value: string;
  label: string;
  subtitle?: string;
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
  const [loadingClients, setLoadingClients] = useState(false)
  const [clients, setClients] = useState<ClientData[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("")
  const [selectedClientLabel, setSelectedClientLabel] = useState("")

  const [clientId, setClientId] = useState("")
  const [planId, setPlanId] = useState("")

  const brandId = useAuthStore((state) => state.getBrandId())
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())
  const token = useAuthStore((state) => state.token)

  const loadSubscriptions = useCallback(async () => {
    if (!brandId) return;

    try {
      const subscriptionsResponse = await axios.get(API_ENDPOINTS.SUBSCRIPTIONS.GET_BY_BRAND(brandId), {
        headers: { Authorization: token },
      })

      setSubscriptions((subscriptionsResponse.data?.subscriptions || []).filter((item: SubscriptionData) => item.status === 'active'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al cargar opciones:", error)
      toast.error(error.response?.data?.message || "Error al cargar membresías")
    }
  }, [brandId, token])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedClientSearch(clientSearch.trim())
    }, 300)

    return () => clearTimeout(timeout)
  }, [clientSearch])

  useEffect(() => {
    if (open) {
      setClientSearch("")
      setDebouncedClientSearch("")
      setClients([])
      loadSubscriptions()
    } else {
      setClientComboboxOpen(false)
    }
  }, [open, loadSubscriptions])

  useEffect(() => {
    if (!open || !brandId) {
      return
    }

    if (!debouncedClientSearch) {
      setClients([])
      setLoadingClients(false)
      return
    }

    let isCancelled = false

    const searchClients = async () => {
      try {
        setLoadingClients(true)
        const response = await axios.get(API_ENDPOINTS.CLIENTS.SEARCH_SELECT(debouncedClientSearch), {
          headers: {
            Authorization: token,
            brandid: brandId,
          },
        })

        if (!isCancelled) {
          setClients(response.data || [])
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (!isCancelled) {
          setClients([])
          console.error("Error al buscar clientes:", error)
          toast.error(error.response?.data?.message || "Error al buscar clientes")
        }
      } finally {
        if (!isCancelled) {
          setLoadingClients(false)
        }
      }
    }

    searchClients()

    return () => {
      isCancelled = true
    }
  }, [open, brandId, token, debouncedClientSearch])

  const handleSelectClient = (client: ClientData) => {
    setClientId(client.value)
    setSelectedClientLabel(client.label)
    setClientComboboxOpen(false)
  }

  const resetForm = () => {
    setClientId("")
    setPlanId("")
    setClientSearch("")
    setDebouncedClientSearch("")
    setSelectedClientLabel("")
    setClients([])
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
              <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="clientId"
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientComboboxOpen}
                    className="w-full justify-between"
                    disabled={loading}
                  >
                    {selectedClientLabel || "Busca y selecciona un cliente"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar por nombre, teléfono, username o ID..."
                      value={clientSearch}
                      onValueChange={setClientSearch}
                    />
                    <CommandList>
                      {!debouncedClientSearch ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Escribe para buscar clientes
                        </div>
                      ) : null}

                      {loadingClients ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Buscando clientes...
                        </div>
                      ) : null}

                      {!loadingClients && debouncedClientSearch && clients.length === 0 ? (
                        <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                      ) : null}

                      {!loadingClients && clients.length > 0 ? (
                        <CommandGroup>
                          {clients.map((client) => (
                            <CommandItem
                              key={client.value}
                              value={client.value}
                              onSelect={() => handleSelectClient(client)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  clientId === client.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate">{client.label}</span>
                                {client.subtitle ? (
                                  <span className="truncate text-xs text-muted-foreground">{client.subtitle}</span>
                                ) : null}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : null}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
