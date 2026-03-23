import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Eye, MoreVertical } from 'lucide-react'
import { PageHeader } from '@/components/global/PageHeader'
import { NewSaleModal } from '@/components/sales/NewSaleModal'
import { DetailsSaleModal } from '@/components/sales/DetailsSaleModal'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { API_ENDPOINTS } from '@/config/api'
import { useAuthStore } from '@/store/authStore'
import ProtectedModule from '@/components/global/ProtectedModule'
import CashCutModal from '@/components/CashCut/CashCutModal'

interface Sale {
  _id: string
  receiptNumber: string
  clientId: {
    firstName?: string
    lastName?: string
    profile: {
      names: string
      lastNames: string
    }
  }
  userId: {
    firstName?: string
    lastName?: string
    profile?: {
      names: string
      lastNames: string
    }
  }
  totals: {
    total: number
  }
  payment: {
    method: string
  }
  status: string
  createdAt: string
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())
  const token = useAuthStore((state) => state.token)

  const asyncLoad = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.SALES.GET_ALL(activeStoreId || ""), {
        headers: {
          Authorization: token,
        },
      })

      console.log(response.data.sales)
      setSales(response.data.sales || [])
    } catch (error) {
      console.error('Error al cargar ventas:', error)
      toast.error('Error al cargar las ventas')
    } finally {
      setIsLoading(false)
    }
  }, [activeStoreId, token])

  useEffect(() => {
    asyncLoad()
  }, [asyncLoad])

  const getStatusBadge = (status: string) => {
    const statusColors = {
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-yellow-100 text-yellow-800',
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
    }
    return labels[method as keyof typeof labels] || method
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Eye />}
        breadcrumbs={[{ label: 'Ventas', href: '/sales' }]}
        title="Ventas"
        description="Gestión de ventas y punto de venta"
      />

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {/* Aquí puedes agregar filtros más adelante */}
        </div>
        <div className="flex items-center gap-2">
          <CashCutModal />
          <ProtectedModule page="Sales" type="create" method="hide">
            <NewSaleModal onSuccess={asyncLoad} />
          </ProtectedModule>
        </div>
      </div>

      <div className="border rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Cargando ventas...
          </div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No hay ventas registradas
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recibo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Método Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale._id}>
                  <TableCell className="font-medium">{sale.receiptNumber}</TableCell>
                  <TableCell>
                    {sale.clientId?.profile?.names || "sale.clientId.firstName"}{' '}
                    {sale.clientId?.profile?.lastNames || "sale.clientId.lastName"}
                  </TableCell>
                  <TableCell>
                    {sale.userId?.profile?.names || "sale.sellerId.firstName"}{' '}
                    {sale.userId?.profile?.lastNames || "sale.sellerId.lastName"}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${sale.totals.total.toFixed(2)}
                  </TableCell>
                  <TableCell>{getPaymentMethodLabel(sale.payment.method)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                        sale.status
                      )}`}
                    >
                      {sale.status === 'completed'
                        ? 'Completada'
                        : sale.status === 'cancelled'
                          ? 'Cancelada'
                          : 'Reembolsada'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(sale.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ProtectedModule page="Sales" type="read" method="hide">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSaleId(sale._id)
                              setDetailsModalOpen(true)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                        </ProtectedModule>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <DetailsSaleModal
        saleId={selectedSaleId}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </div>
  )
}

