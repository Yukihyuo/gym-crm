import React, { useEffect, useState } from 'react'
import apiClient from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, ShoppingCart, Users, Package, Calendar, DollarSign, CreditCard } from 'lucide-react'

interface DashboardSummary {
  currentMonth: {
    revenue: number
    sales: number
    revenueChange: number
    salesChange: number
  }
  subscriptions: {
    active: number
    newThisMonth: number
  }
  inventory: {
    lowStockCount: number
  }
  clients: {
    total: number
  }
}

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
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topSubscriptions, setTopSubscriptions] = useState<TopSubscription[]>([])
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategory[]>([])
  const [salesByPayment, setSalesByPayment] = useState<SalesByPayment[]>([])
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([])
  const [expiring, setExpiring] = useState<ExpiringSubscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [summaryRes, productsRes, subscriptionsRes, categoryRes, paymentRes, buyersRes, expiringRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.ANALYTICS.DASHBOARD_SUMMARY),
        apiClient.get(API_ENDPOINTS.ANALYTICS.PRODUCTS_TOP_SELLING + '?limit=5'),
        apiClient.get(API_ENDPOINTS.ANALYTICS.SUBSCRIPTIONS_MOST_ACQUIRED),
        apiClient.get(API_ENDPOINTS.ANALYTICS.REVENUE_BY_CATEGORY),
        apiClient.get(API_ENDPOINTS.ANALYTICS.SALES_BY_PAYMENT_METHOD),
        apiClient.get(API_ENDPOINTS.ANALYTICS.CLIENTS_TOP_BUYERS + '?limit=5'),
        apiClient.get(API_ENDPOINTS.ANALYTICS.SUBSCRIPTIONS_EXPIRING_SOON + '?days=30')
      ])

      setSummary(summaryRes.data)
      setTopProducts(productsRes.data)
      setTopSubscriptions(subscriptionsRes.data)
      setRevenueByCategory(categoryRes.data)
      setSalesByPayment(paymentRes.data)
      setTopBuyers(buyersRes.data)
      setExpiring(expiringRes.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value)
  }

  const formatPercent = (value: number) => {
    const isPositive = value >= 0
    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    )
  }

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del negocio</p>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.currentMonth.revenue || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
              {formatPercent(summary?.currentMonth.revenueChange || 0)} vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.currentMonth.sales || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
              {formatPercent(summary?.currentMonth.salesChange || 0)} vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscripciones Activas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.subscriptions.active || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{summary?.subscriptions.newThisMonth || 0} nuevas este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.clients.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.inventory.lowStockCount || 0} productos bajo stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Productos más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>Top 5 productos por cantidad vendida</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="productName" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => value} />
                <Bar dataKey="totalQuantity" fill="#8884d8" name="Cantidad Vendida" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ingresos por categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Categoría</CardTitle>
            <CardDescription>Distribución de ingresos por tipo de producto</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Subscripciones más adquiridas */}
        <Card>
          <CardHeader>
            <CardTitle>Subscripciones Populares</CardTitle>
            <CardDescription>Planes más adquiridos por los clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSubscriptions} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="totalAcquisitions" fill="#00C49F" name="Total Adquisiciones" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ventas por método de pago */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
            <CardDescription>Distribución de ventas por forma de pago</CardDescription>
          </CardHeader>
          <CardContent>
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
  )
}
