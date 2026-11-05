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
import { Banknote, Check, ChevronsUpDown, CreditCard, ArrowRightLeft, TriangleAlert } from "lucide-react"
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"
import { useBrandConfigStore } from "@/store/brandConfigStore"
import { useCashCutStore } from "@/store/cashCutStore"
import { useCashGate } from "@/components/CashCut/useCashGate"
import { resolveCashCutConflict } from "@/components/CashCut/cashCutConflict"
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
  trigger?: React.ReactNode;
  /** Si se define, el modal se controla desde fuera (sin trigger propio salvo que se pase `trigger`). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Cliente fijo: se muestra como dato de solo lectura en lugar del buscador. */
  presetClient?: { value: string; label: string };
  presetPlanId?: string | null;
  title?: string;
  description?: string;
  submitLabel?: string;
}

interface ClientData {
  value: string;
  label: string;
  subtitle?: string;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", Icon: Banknote },
  { value: "card", label: "Tarjeta", Icon: CreditCard },
  { value: "transfer", label: "Transferencia", Icon: ArrowRightLeft },
] as const

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

export default function NewSubscriptionsAssignment({
  onSubmit,
  onAssignmentCreated,
  trigger,
  open: openProp,
  onOpenChange,
  presetClient,
  presetPlanId,
  title = "Nueva Asignación de Membresía",
  description = "Selecciona cliente y membresía para crear la asignación",
  submitLabel = "Asignar",
}: BaseDocumentProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }
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
  const [paymentMethod, setPaymentMethod] = useState("")

  const brandId = useAuthStore((state) => state.getBrandId())
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())
  const token = useAuthStore((state) => state.token)
  const requireCashClosing = useBrandConfigStore((state) => state.config?.requireCashClosing ?? false)
  const cashCutId = useCashCutStore((state) => state.cashCutId)
  const { requiresCash: cashBlocked, ensureCash, cashGateDialog } = useCashGate()
  const presetClientId = presetClient?.value
  const presetClientLabel = presetClient?.label

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
      if (presetClientId) {
        setClientId(presetClientId)
        setSelectedClientLabel(presetClientLabel ?? "")
      }
      if (presetPlanId) {
        setPlanId(presetPlanId)
      }
      loadSubscriptions()
    } else {
      setClientComboboxOpen(false)
    }
  }, [open, loadSubscriptions, presetClientId, presetClientLabel, presetPlanId])

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

  // El plan que ya tenía el cliente va primero para renovar con un solo toque.
  const orderedSubscriptions = presetPlanId
    ? [...subscriptions].sort((a, b) => Number(b._id === presetPlanId) - Number(a._id === presetPlanId))
    : subscriptions

  const handleSelectClient = (client: ClientData) => {
    setClientId(client.value)
    setSelectedClientLabel(client.label)
    setClientComboboxOpen(false)
  }

  const resetForm = () => {
    setClientId("")
    setPlanId("")
    setPaymentMethod("")
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

    if (!clientId || !planId || !paymentMethod) {
      toast.error("Debes seleccionar cliente, membresía y método de pago")
      return
    }

    if (requireCashClosing && !cashCutId) {
      toast.error("Debes abrir la caja antes de asignar una membresía")
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
          paymentMethod,
        },
        {
          headers: {
            Authorization: token,
            ...(cashCutId ? { "X-Cash-Cut-Id": cashCutId } : {}),
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

      // Caja expirada o de otra sucursal: se vuelve a pedir abrirla y se retoma la asignación.
      if (await resolveCashCutConflict(error) && !useCashCutStore.getState().cashCutId) {
        setOpen(false)
        ensureCash(() => setOpen(true))
      }
    } finally {
      setLoading(false)
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          ensureCash(() => setOpen(true))
          return
        }

        setOpen(false)
      }}
    >
      {!isControlled || trigger ? (
        <DialogTrigger asChild>
          {trigger ?? <Button variant="default">Asignar Membresía</Button>}
        </DialogTrigger>
      ) : null}

      <DialogContent >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {cashBlocked ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Debes abrir la caja antes de asignar una membresía.</span>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="clientId">Cliente *</Label>
              {presetClient ? (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                  {presetClient.label}
                </div>
              ) : (
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
              )}
            </div>

            <div className="grid gap-2">
              <Label id="paymentMethodLabel">Método de Pago *</Label>
              <div role="radiogroup" aria-labelledby="paymentMethodLabel" className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(({ value, label, Icon }) => {
                  const isSelected = paymentMethod === value

                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setPaymentMethod(value)}
                      disabled={loading}
                      className={cn(
                        "flex h-14 flex-col items-center justify-center gap-1 rounded-md border text-sm font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="planId">Membresía *</Label>
              {subscriptions.length === 0 ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  No hay membresías activas disponibles.
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {orderedSubscriptions.map((subscription) => {
                    const isSelected = planId === subscription._id
                    const benefits = (subscription.benefits || []).filter((item) => item.included !== false)

                    return (
                      <button
                        key={subscription._id}
                        type="button"
                        onClick={() => setPlanId(subscription._id)}
                        className={`w-full rounded-md border p-3 text-left transition-colors ${isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary'
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

            <Button type="submit" disabled={loading || cashBlocked}>
              {loading ? "Guardando..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {cashGateDialog}
    </Dialog>
  );
}
