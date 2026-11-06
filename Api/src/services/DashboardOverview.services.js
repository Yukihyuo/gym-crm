import dayjs from "dayjs"

import Sale from "../models/Sale.js"
import Visit from "../models/Visit.js"
import Client from "../models/Client.js"
import Product from "../models/Product.js"
import SubscriptionAssignment from "../models/SubscriptionAssignment.js"

export const DASHBOARD_PERIODS = ["today", "week", "month"]

const EXPIRING_THRESHOLD_DAYS = 7
const LOW_STOCK_THRESHOLD = 10

const sumBy = (rows, key) => rows[0]?.[key] ?? 0

const percentChange = (current, previous) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null

/**
 * Rango del periodo y su equivalente anterior de la misma duración, para comparar justo
 * (p. ej. "hoy hasta ahora" contra "ayer a la misma hora").
 */
export const resolvePeriodRange = (period, now = dayjs()) => {
  const safePeriod = DASHBOARD_PERIODS.includes(period) ? period : "today"

  const start =
    safePeriod === "month"
      ? now.startOf("month")
      : safePeriod === "week"
        ? now.startOf("day").subtract(6, "day")
        : now.startOf("day")

  const previousStart =
    safePeriod === "month"
      ? start.subtract(1, "month")
      : start.subtract(safePeriod === "week" ? 7 : 1, "day")

  // Un mes anterior más corto no debe invadir el periodo actual.
  const previousEndMs = Math.min(previousStart.valueOf() + now.diff(start), start.valueOf())

  return {
    period: safePeriod,
    current: { start: start.toDate(), end: now.toDate() },
    previous: { start: previousStart.toDate(), end: new Date(previousEndMs) },
  }
}

/** Filtro createdAt a partir de `period` o, por compatibilidad, de `startDate`/`endDate`. */
export const buildCreatedAtFilter = (query = {}) => {
  if (query.period) {
    const { current } = resolvePeriodRange(query.period)
    return { $gte: current.start, $lte: current.end }
  }

  if (!query.startDate && !query.endDate) {
    return undefined
  }

  const filter = {}
  if (query.startDate) filter.$gte = dayjs(query.startDate).toDate()
  if (query.endDate) filter.$lte = dayjs(query.endDate).toDate()
  return filter
}

const aggregateRevenue = async (storeIds, range, isCurrent) => {
  const createdAt = isCurrent
    ? { $gte: range.start, $lte: range.end }
    : { $gte: range.start, $lt: range.end }

  const [sales, memberships, accesses] = await Promise.all([
    Sale.aggregate([
      { $match: { status: "completed", storeId: { $in: storeIds }, createdAt } },
      { $group: { _id: null, revenue: { $sum: "$totals.total" }, count: { $sum: 1 } } },
    ]),
    SubscriptionAssignment.aggregate([
      { $match: { storeId: { $in: storeIds }, status: { $ne: "cancelled" }, createdAt } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$pricePaid" },
          // Los cargos únicos (inscripción) no tienen endDate: cuentan como ingreso, no como membresía vendida.
          sold: { $sum: { $cond: [{ $ne: [{ $ifNull: ["$endDate", null] }, null] }, 1, 0] } },
        },
      },
    ]),
    Visit.countDocuments({ storeId: { $in: storeIds }, createdAt }),
  ])

  const productsRevenue = sumBy(sales, "revenue")
  const membershipsRevenue = sumBy(memberships, "revenue")

  return {
    revenue: {
      total: productsRevenue + membershipsRevenue,
      products: productsRevenue,
      memberships: membershipsRevenue,
    },
    sales: sumBy(sales, "count"),
    membershipsSold: sumBy(memberships, "sold"),
    accesses,
  }
}

// Foto actual de la cartera de socios: no depende del periodo seleccionado.
const aggregateMembershipPortfolio = async (brandId, storeIds, now) => {
  const todayStart = now.startOf("day").toDate()
  const expiringLimit = now.startOf("day").add(EXPIRING_THRESHOLD_DAYS + 1, "day").toDate()

  const [portfolio] = await SubscriptionAssignment.aggregate([
    {
      $match: {
        brandId,
        storeId: { $in: storeIds },
        clientId: { $ne: null },
        endDate: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$clientId",
        // Fin de la membresía vigente (o futura); null si el socio ya no tiene ninguna.
        currentEnd: {
          $max: {
            $cond: [
              { $and: [{ $eq: ["$status", "active"] }, { $gte: ["$endDate", todayStart] }] },
              "$endDate",
              null,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        active: { $sum: { $cond: [{ $ne: ["$currentEnd", null] }, 1, 0] } },
        expiring: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ["$currentEnd", null] }, { $lt: ["$currentEnd", expiringLimit] }] },
              1,
              0,
            ],
          },
        },
        expired: { $sum: { $cond: [{ $eq: ["$currentEnd", null] }, 1, 0] } },
      },
    },
  ])

  return {
    active: portfolio?.active ?? 0,
    expiring: portfolio?.expiring ?? 0,
    expired: portfolio?.expired ?? 0,
  }
}

export const getDashboardOverview = async ({ brandId, storeIds, period }) => {
  const now = dayjs()
  const range = resolvePeriodRange(period, now)

  const [current, previous, portfolio, totalClients, lowStock] = await Promise.all([
    aggregateRevenue(storeIds, range.current, true),
    aggregateRevenue(storeIds, range.previous, false),
    aggregateMembershipPortfolio(brandId, storeIds, now),
    Client.countDocuments({ brandId }),
    Product.countDocuments({
      storeId: { $in: storeIds },
      stock: { $lt: LOW_STOCK_THRESHOLD },
      status: "available",
    }),
  ])

  return {
    period: range.period,
    range: range.current,
    revenue: {
      ...current.revenue,
      previousTotal: previous.revenue.total,
      change: percentChange(current.revenue.total, previous.revenue.total),
    },
    sales: {
      count: current.sales,
      change: percentChange(current.sales, previous.sales),
    },
    accesses: {
      count: current.accesses,
      change: percentChange(current.accesses, previous.accesses),
    },
    memberships: {
      sold: current.membershipsSold,
      change: percentChange(current.membershipsSold, previous.membershipsSold),
      ...portfolio,
    },
    clients: { total: totalClients },
    inventory: { lowStockCount: lowStock },
  }
}
