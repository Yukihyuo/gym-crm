import { useEffect, useMemo, useState } from 'react'
import apiClient from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DownloadFinancialReport from '@/components/Dasboard/DownloadFinancialReport'
import { DashboardFilters } from '@/components/Dasboard/DashboardFilters'
import { OverviewKpis } from '@/components/Dasboard/OverviewKpis'
import {
  ALL_STORES,
  PERIOD_OPTIONS,
  formatCurrency,
  type DashboardOverview,
  type DashboardPeriod,
} from '@/components/Dasboard/dashboardOverview'
import { useAuthStore } from '@/store/authStore'

interface TopProduct {
  _id: string
  productName: string
  totalQuantity: number
  totalRevenue: number
  salesCount: number
}

interface TopSubscription {
  _id: string
  name: string
  durationInMonths: number
  totalAcquisitions: number
}

interface RevenueByCategory {
  _id: string
  totalRevenue: number
  totalQuantity: number
  salesCount: number
}

interface SalesByPayment {
  _id: string
  totalSales: number
  totalRevenue: number
}

interface TopBuyer {
  _id: string
  clientName: string
  clientEmail: string
  totalPurchases: number
  totalSpent: number
  averageTicket: number
}

interface ExpiringSubscription {
  _id: string
  userName: string
  userEmail: string
  subscriptionName: string
  endDate: string
  daysRemaining: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d']

export default function Page() {
  const [period, setPeriod] = useState<DashboardPeriod>('today')
  const [storeId, setStoreId] = useState<string>(ALL_STORES)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topSubscriptions, setTopSubscriptions] = useState<TopSubscription[]>([])
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategory[]>([])
  const [salesByPayment, setSalesByPayment] = useState<SalesByPayment[]>([])
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([])
  const [expiring, setExpiring] = useState<ExpiringSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const accessStores = useAuthStore((state) => state.access?.stores)
  const stores = useMemo(
    () =>
      (accessStores ?? []).flatMap((store) => {
        const id = store._id ?? store.id
        return id ? [{ id, name: store.name }] : []
      }),
    [accessStores]
  )

  const periodTitle = PERIOD_OPTIONS.find((option) => option.value === period)?.title ?? ''

  useEffect(() => {
    let cancelled = false

    const fetchDashboardData = async () => {
      const params = { period, storeId }

      try {
        setRefreshing(true)
        const [overviewRes, productsRes, subscriptionsRes, categoryRes, paymentRes, buyersRes, expiringRes] = await Promise.all([
          apiClient.get(API_ENDPOINTS.ANALYTICS.DASHBOARD_OVERVIEW, { params }),
          apiClient.get(API_ENDPOINTS.ANALYTICS.PRODUCTS_TOP_SELLING, { params: { ...params, limit: 5 } }),
          apiClient.get(API_ENDPOINTS.ANALYTICS.SUBSCRIPTIONS_MOST_ACQUIRED, { params }),
          apiClient.get(API_ENDPOINTS.ANALYTICS.REVENUE_BY_CATEGORY, { params }),
          apiClient.get(API_ENDPOINTS.ANALYTICS.SALES_BY_PAYMENT_METHOD, { params }),
          apiClient.get(API_ENDPOINTS.ANALYTICS.CLIENTS_TOP_BUYERS, { params: { ...params, limit: 5 } }),
          apiClient.get(API_ENDPOINTS.ANALYTICS.SUBSCRIPTIONS_EXPIRING_SOON, { params: { storeId, days: 30 } })
        ])

        if (cancelled) return

        setOverview(overviewRes.data)
        setTopProducts(productsRes.data)
        setTopSubscriptions(subscriptionsRes.data)
        setRevenueByCategory(categoryRes.data)
        setSalesByPayment(paymentRes.data)
        setTopBuyers(buyersRes.data)
        setExpiring(expiringRes.data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    void fetchDashboardData()

    return () => {
      cancelled = true
    }
  }, [period, storeId])

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia'
  }

  const emptyState = (
    <p className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
      Sin datos en este periodo
    </p>
  )

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Cómo va tu gimnasio · {periodTitle}</p>
        </div>
        <DashboardFilters
          period={period}
          onPeriodChange={setPeriod}
          storeId={storeId}
          onStoreChange={setStoreId}
          stores={stores}
        />
      </div>

      <div className={refreshing ? 'space-y-6 opacity-60 transition-opacity' : 'space-y-6 transition-opacity'} aria-busy={refreshing}>
        {overview && <OverviewKpis overview={overview} />}
        <DownloadFinancialReport/>
      {/* Gráficos principales */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Productos más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>Top 5 productos por cantidad vendida</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? emptyState : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="productName" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => value} />
                <Bar dataKey="totalQuantity" fill="#8884d8" name="Cantidad Vendida" />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Ingresos por categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Categoría</CardTitle>
            <CardDescription>Distribución de ingresos por tipo de producto</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByCategory.length === 0 ? emptyState : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByCategory}
                  dataKey="totalRevenue"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry._id}: ${formatCurrency(entry.totalRevenue)}`}
                >
                  {revenueByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Subscripciones más adquiridas */}
        <Card>
          <CardHeader>
            <CardTitle>Subscripciones Populares</CardTitle>
            <CardDescription>Planes más adquiridos por los clientes</CardDescription>
          </CardHeader>
          <CardContent>
            {topSubscriptions.length === 0 ? emptyState : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSubscriptions} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="totalAcquisitions" fill="#00C49F" name="Total Adquisiciones" />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Ventas por método de pago */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
            <CardDescription>Distribución de ventas por forma de pago</CardDescription>
          </CardHeader>
          <CardContent>
            {salesByPayment.length === 0 ? emptyState : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesByPayment}
                  dataKey="totalRevenue"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${paymentMethodLabels[entry._id]}: ${entry.totalSales} ventas`}
                >
                  {salesByPayment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [formatCurrency(Number(value)), paymentMethodLabels[name as string] || name]}
                />
              </PieChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tablas de información */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Mejores Clientes</CardTitle>
            <CardDescription>Clientes con mayor gasto total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topBuyers.map((buyer, index) => (
                <div key={buyer._id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{buyer.clientName}</p>
                      <p className="text-sm text-muted-foreground">{buyer.totalPurchases} compras</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(buyer.totalSpent)}</p>
                    <p className="text-sm text-muted-foreground">Ticket: {formatCurrency(buyer.averageTicket)}</p>
                  </div>
                </div>
              ))}
              {topBuyers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Sin compras en este periodo</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscripciones próximas a vencer */}
        <Card>
          <CardHeader>
            <CardTitle>Subscripciones por Vencer</CardTitle>
            <CardDescription>Próximos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expiring.slice(0, 5).map((sub) => (
                <div key={sub._id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{sub.userName}</p>
                    <p className="text-sm text-muted-foreground">{sub.subscriptionName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">{Math.ceil(sub.daysRemaining)} días</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sub.endDate).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </div>
              ))}
              {expiring.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No hay subscripciones próximas a vencer</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
