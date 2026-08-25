import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Check, ChevronsUpDown, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useBrandConfigStore, type BrandSettings } from '@/store/brandConfigStore'
import { useAuthStore } from '@/store/authStore'
import apiClient from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'

interface ClientOption {
  value: string
  label: string
  subtitle?: string
}

interface Subscription {
  _id: string
  name: string
}

export default function BrandConfigPage() {
  const brandId = useAuthStore((state) => state.getBrandId())
  const token = useAuthStore((state) => state.token)
  const { config, loading, fetchConfig, updateConfig } = useBrandConfigStore()

  const [form, setForm] = useState<BrandSettings | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('')
  const [selectedClientLabel, setSelectedClientLabel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedClientSearch(clientSearch.trim())
    }, 300)

    return () => clearTimeout(timeout)
  }, [clientSearch])

  // Sync form state when config loads
  useEffect(() => {
    if (config) setForm({ ...config })
  }, [config])

  // Fetch config and subscriptions on mount
  useEffect(() => {
    if (!brandId) return
    void fetchConfig(brandId)

    apiClient
      .get<{ subscriptions: Subscription[] }>(API_ENDPOINTS.SUBSCRIPTIONS.GET_BY_BRAND(brandId))
      .then((r) => setSubscriptions(r.data.subscriptions ?? []))
      .catch(() => {})
  }, [brandId, fetchConfig])

  useEffect(() => {
    if (!brandId) {
      return
    }

    if (!debouncedClientSearch) {
      setClients([])
      setIsLoadingClients(false)
      return
    }

    let isCancelled = false

    const searchClients = async () => {
      try {
        setIsLoadingClients(true)
        const response = await apiClient.get<ClientOption[]>(
          API_ENDPOINTS.CLIENTS.SEARCH_SELECT(debouncedClientSearch),
          {
            headers: {
              Authorization: token,
              brandid: brandId,
            },
          }
        )

        if (!isCancelled) {
          setClients(response.data || [])
        }
      } catch (error) {
        if (!isCancelled) {
          setClients([])
          console.error('Error al buscar clientes:', error)
          toast.error('Error al buscar clientes')
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingClients(false)
        }
      }
    }

    void searchClients()

    return () => {
      isCancelled = true
    }
  }, [brandId, token, debouncedClientSearch])

  const setBool = (key: keyof BrandSettings, value: boolean) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const setString = (key: keyof BrandSettings, value: string | null) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    try {
      await updateConfig(form)
      toast.success('Configuración actualizada')
    } catch {
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !form) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración de marca</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajusta el comportamiento del sistema para esta marca.
        </p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-6">
        {/* Corte de caja */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Corte de caja</CardTitle>
            <CardDescription>Opciones relacionadas al manejo de caja.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="requireCashClosing"
                checked={form.requireCashClosing}
                onCheckedChange={(v) => setBool('requireCashClosing', !!v)}
              />
              <Label htmlFor="requireCashClosing">
                Requerir corte de caja antes de registrar operaciones
              </Label>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Ventas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas</CardTitle>
            <CardDescription>Opciones relacionadas al registro de ventas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="requireSaleUser"
                checked={form.requireSaleUser}
                onCheckedChange={(v) => setBool('requireSaleUser', !!v)}
              />
              <Label htmlFor="requireSaleUser">
                Requerir usuario al registrar una venta
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userSaleDefault">Usuario de venta por defecto</Label>
              <Popover
                open={clientComboboxOpen}
                onOpenChange={(nextOpen) => {
                  setClientComboboxOpen(nextOpen)
                  if (!nextOpen) {
                    setClientSearch('')
                    setDebouncedClientSearch('')
                    setClients([])
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="userSaleDefault"
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientComboboxOpen}
                    className="w-full justify-between"
                  >
                    {selectedClientLabel || 'Busca y selecciona un cliente'}
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

                      {isLoadingClients ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Buscando clientes...
                        </div>
                      ) : null}

                      {!isLoadingClients && debouncedClientSearch && clients.length === 0 ? (
                        <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                      ) : null}

                      {!isLoadingClients && clients.length > 0 ? (
                        <CommandGroup>
                          {clients.map((client) => (
                            <CommandItem
                              key={client.value}
                              value={client.value}
                              onSelect={() => {
                                setString('userSaleDefault', client.value)
                                setSelectedClientLabel(client.label)
                                setClientComboboxOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  form.userSaleDefault === client.value ? 'opacity-100' : 'opacity-0'
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
          </CardContent>
        </Card>

        <Separator />

        {/* Inscripción */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscripción</CardTitle>
            <CardDescription>Opciones relacionadas al cobro de cuota de inscripción.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="requiresRegistrationFee"
                checked={form.requiresRegistrationFee}
                onCheckedChange={(v) => setBool('requiresRegistrationFee', !!v)}
              />
              <Label htmlFor="requiresRegistrationFee">
                Requerir cuota de inscripción al registrar miembro
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationFeeId">Suscripción de cuota de inscripción</Label>
              <Select
                value={form.registrationFeeId ?? '__none__'}
                onValueChange={(v) => setString('registrationFeeId', v === '__none__' ? null : v)}
                disabled={!form.requiresRegistrationFee}
              >
                <SelectTrigger id="registrationFeeId">
                  <SelectValue placeholder="Seleccionar suscripción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguna</SelectItem>
                  {subscriptions.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Membresías */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membresías</CardTitle>
            <CardDescription>Opciones relacionadas a la asignación de membresías.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="requireSpecificMembershipStartDate"
                checked={form.requireSpecificMembershipStartDate}
                onCheckedChange={(v) => setBool('requireSpecificMembershipStartDate', !!v)}
              />
              <Label htmlFor="requireSpecificMembershipStartDate">
                Requerir fecha de inicio específica al asignar membresía
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin mr-2 size-4" /> : <Save className="mr-2 size-4" />}
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  )
}
