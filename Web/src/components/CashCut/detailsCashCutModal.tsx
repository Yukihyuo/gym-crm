import { useState, useEffect, useCallback } from "react"
import { Eye, Loader2, ChevronDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import apiClient from "@/lib/axios"
import { API_ENDPOINTS } from "@/config/api"
import { toast } from "react-toastify"

interface CashCutDetails {
  _id: string
  staffId: {
    _id: string
    username: string
    email: string
    profile?: {
      names?: string
      lastNames?: string
    }
  }
  brandId: string
  storeId: string
  openingDate: string
  closingDate?: string | null
  initialCash: number
  systemTotals: {
    byMethod: {
      cash: number
      transfer: number
      card: number
    }
    byCategory: {
      products: number
      subscriptions: number
    }
    grandTotal: number
  }
  reportedTotals: {
    cashInHand: number
    transferReceipts: number
    cardSlips: number
  }
  cashDifference: number
  status: 'balanced' | 'shortage' | 'surplus' | 'pending' | 'incomplete'
  notes?: string
  salesIds?: Array<{
    _id: string
    totals?: {
      total: number
    }
    payment?: {
      method?: string
    }
    clientId?: {
      _id?: string
      name?: string
    }
    createdAt?: string
  }>
  subscriptionAssignmentIds?: Array<{
    _id: string
    clientId?: {
      _id?: string
      name?: string
      profile?: {
        names?: string
      }
    }
    subscription?: {
      _id?: string
      name?: string
      price?: number
    }
    pricePaid?: number
    paymentMethod?: string
    startDate?: string
  }>
  expensesIds?: Array<{
    _id: string
    amount: number
    category: string
    description: string
    source: string
    date?: string
    userId?: {
      _id?: string
      username?: string
    }
  }>
}

const formatPaymentMethod = (method: string) => {
  if (method === 'cash') return 'Efectivo'
  if (method === 'transfer') return 'Transferencia'
  if (method === 'card') return 'Tarjeta'
  return method
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value ?? 0))

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    incomplete: 'Incompleto',
    balanced: 'Cuadrado',
    shortage: 'Faltante',
    surplus: 'Sobrante',
  }
  return labels[status] || status
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    balanced: 'bg-green-100 text-green-700',
    shortage: 'bg-red-100 text-red-700',
    surplus: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    incomplete: 'bg-yellow-100 text-yellow-700',
  }
  return classes[status] || 'bg-muted text-muted-foreground'
}

interface DetailsCashCutModalProps {
  cashCutId: string
}

export default function DetailsCashCutModal({ cashCutId }: DetailsCashCutModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cashCutData, setCashCutData] = useState<CashCutDetails | null>(null)

  const loadCashCutDetails = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<{ cashCut: CashCutDetails }>(
        API_ENDPOINTS.CASH_CUTS.GET_BY_ID(cashCutId)
      )
      setCashCutData(response.data.cashCut)
    } catch (error) {
      toast.error('Error al cargar detalles del corte de caja')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [cashCutId])

  useEffect(() => {
    if (open && !cashCutData) {
      loadCashCutDetails()
    }
  }, [open, loadCashCutDetails, cashCutData])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="w-full text-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>Ver detalles</span>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Corte de Caja</DialogTitle>
          <DialogDescription>
            Información completa del corte de caja
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cashCutData ? (
          <div className="space-y-6">
            {/* Información General */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              <div>
                <p className="text-sm text-muted-foreground">Usuario</p>
                <p className="font-medium">
                  {cashCutData.staffId?.username}
                  {cashCutData.staffId?.profile?.names && (
                    <span className="text-sm text-muted-foreground">
                      {' '}
                      ({cashCutData.staffId.profile.names})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-sm">{cashCutData.staffId?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Apertura</p>
                <p className="font-medium text-sm">{formatDate(cashCutData.openingDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cierre</p>
                <p className="font-medium text-sm">
                  {formatDate(cashCutData.closingDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(
                    cashCutData.status
                  )}`}
                >
                  {getStatusLabel(cashCutData.status)}
                </span>
              </div>
            </div>

            {/* Totales Principales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Fondo Inicial</p>
                <p className="text-xl font-semibold">{formatCurrency(cashCutData.initialCash)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Sistema</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(cashCutData.systemTotals?.grandTotal)}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Efectivo Reportado</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(cashCutData.reportedTotals?.cashInHand)}
                </p>
              </div>
              <div
                className={`p-4 rounded-lg ${cashCutData.cashDifference === 0
                    ? 'bg-green-50'
                    : cashCutData.cashDifference < 0
                      ? 'bg-red-50'
                      : 'bg-blue-50'
                  }`}
              >
                <p className="text-sm text-muted-foreground">Diferencia</p>
                <p
                  className={`text-xl font-semibold ${cashCutData.cashDifference === 0
                      ? 'text-green-700'
                      : cashCutData.cashDifference < 0
                        ? 'text-red-700'
                        : 'text-blue-700'
                    }`}
                >
                  {formatCurrency(cashCutData.cashDifference)}
                </p>
              </div>
            </div>

            {/* Secciones Expandibles */}
            <div className="space-y-3">
              {/* Métodos de Pago */}
              <Collapsible defaultOpen className="border rounded-lg">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                  <h4 className="font-semibold text-sm">Métodos de Pago</h4>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-3 border-t">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Efectivo</p>
                      <p className="font-semibold">
                        {formatCurrency(cashCutData.systemTotals?.byMethod?.cash)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Transferencia</p>
                      <p className="font-semibold">
                        {formatCurrency(cashCutData.systemTotals?.byMethod?.transfer)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Tarjeta</p>
                      <p className="font-semibold">
                        {formatCurrency(cashCutData.systemTotals?.byMethod?.card)}
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Categorías */}
              <Collapsible className="border rounded-lg">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                  <h4 className="font-semibold text-sm">Categorías</h4>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-3 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Productos</p>
                      <p className="font-semibold">
                        {formatCurrency(cashCutData.systemTotals?.byCategory?.products)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Suscripciones</p>
                      <p className="font-semibold">
                        {formatCurrency(cashCutData.systemTotals?.byCategory?.subscriptions)}
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Totales Reportados */}
              <Collapsible className="border rounded-lg">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                  <h4 className="font-semibold text-sm">Totales Reportados</h4>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-3 border-t">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Efectivo en Mano</p>
                      <p className="font-semibold">
                        {formatCurrency(cashCutData.reportedTotals?.cashInHand)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Comprobantes Transfer.</p>
                      <p className="font-semibold">
                        {formatCurrency(cashCutData.reportedTotals?.transferReceipts)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Vouchers Tarjeta</p>
                      <p className="font-semibold">
                        {formatCurrency(cashCutData.reportedTotals?.cardSlips)}
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Ventas */}
              {cashCutData.salesIds && cashCutData.salesIds.length > 0 && (
                <Collapsible className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                    <h4 className="font-semibold text-sm">
                      Ventas ({cashCutData.salesIds.length})
                    </h4>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-3 border-t">
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {cashCutData.salesIds.map((sale) => (
                        <div key={sale._id} className="text-xs p-2 bg-muted rounded border">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">

                              {sale.payment?.method && (
                                <p className="text-muted-foreground text-xs">Método: {formatPaymentMethod(sale.payment.method)}</p>
                              )}
                              {sale.createdAt && (
                                <p className="text-muted-foreground text-xs">{formatDate(sale.createdAt)}</p>
                              )}
                            </div>
                            <p className="font-semibold whitespace-nowrap">{formatCurrency(sale.totals?.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Suscripciones */}
              {cashCutData.subscriptionAssignmentIds && cashCutData.subscriptionAssignmentIds.length > 0 && (
                <Collapsible className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                    <h4 className="font-semibold text-sm">
                      Suscripciones ({cashCutData.subscriptionAssignmentIds.length})
                    </h4>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-3 border-t">
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {cashCutData.subscriptionAssignmentIds.map((sub) => (
                        <div key={sub._id} className="text-xs p-2 bg-muted rounded border">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="text-muted-foreground text-xs">Método: {formatPaymentMethod(sub?.paymentMethod || '-')}</p>
                              {sub.startDate && (
                                <p className="text-muted-foreground text-xs">Inicio: {formatDate(sub.startDate)}</p>
                              )}
                            </div>
                            <p className="font-semibold whitespace-nowrap">{formatCurrency(sub.pricePaid)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Gastos */}
              {cashCutData.expensesIds && cashCutData.expensesIds.length > 0 && (
                <Collapsible className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                    <h4 className="font-semibold text-sm">
                      Gastos ({cashCutData.expensesIds.length})
                    </h4>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-3 border-t">
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {cashCutData.expensesIds.map((expense) => (
                        <div key={expense._id} className="text-xs p-2 bg-muted rounded border">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-1">
                                <span>{expense.source === 'cash_drawer' ? '💵' : '🏦'}</span>
                                <p className="font-medium">{expense.category}</p>
                              </div>
                              {expense.description && (
                                <p className="text-muted-foreground text-xs">{expense.description}</p>
                              )}
                              {expense.userId?.username && (
                                <p className="text-muted-foreground text-xs">Registrado por: {expense.userId.username}</p>
                              )}
                              {expense.date && (
                                <p className="text-muted-foreground text-xs">{formatDate(expense.date)}</p>
                              )}
                            </div>
                            <p className="font-semibold whitespace-nowrap">{formatCurrency(expense.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Notas */}
              {cashCutData.notes && (
                <Collapsible className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                    <h4 className="font-semibold text-sm">Notas</h4>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-3 border-t">
                    <p className="text-sm text-muted-foreground">{cashCutData.notes}</p>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
