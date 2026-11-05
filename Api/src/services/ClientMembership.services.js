import dayjs from "dayjs"
import SubscriptionAssignment from "../models/SubscriptionAssignment.js"
import Subscription from "../models/Subscription.js"
import Visit from "../models/Visit.js"

export const MEMBERSHIP_STATES = {
  ACTIVE: 'active',
  EXPIRING: 'expiring',
  UPCOMING: 'upcoming',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  NONE: 'none',
}

const DATE_FORMAT = 'DD/MM/YYYY'

// Texto corto para selectores: deja claro de un vistazo si el socio puede entrar o debe pagar.
export const describeMembership = (membership) => {
  const until = membership.endDate ? dayjs(membership.endDate).format(DATE_FORMAT) : ''

  switch (membership.state) {
    case MEMBERSHIP_STATES.ACTIVE:
      return `Vigente hasta ${until}`
    case MEMBERSHIP_STATES.EXPIRING:
      return `Vence ${until}`
    case MEMBERSHIP_STATES.UPCOMING:
      return `Inicia ${dayjs(membership.startDate).format(DATE_FORMAT)}`
    case MEMBERSHIP_STATES.EXPIRED:
      return `Vencida ${until}`
    case MEMBERSHIP_STATES.CANCELLED:
      return 'Membresía cancelada'
    default:
      return 'Sin membresía'
  }
}

const EXPIRING_THRESHOLD_DAYS = 7

const toSummary = (state, assignment, planNames, todayStart) => ({
  state,
  planName: assignment ? planNames.get(assignment.planId) ?? null : null,
  startDate: assignment?.startDate ?? null,
  endDate: assignment?.endDate ?? null,
  daysLeft: assignment?.endDate ? dayjs(assignment.endDate).startOf('day').diff(todayStart, 'day') : null,
})

// Mismo criterio que registerVisit: activa = status active y todayStart dentro de [startDate, endDate].
const resolveMembership = (assignments, planNames, todayStart) => {
  if (!assignments.length) {
    return toSummary(MEMBERSHIP_STATES.NONE, null, planNames, todayStart)
  }

  const isActive = (a) =>
    a.status === 'active' && a.startDate <= todayStart && a.endDate >= todayStart
  const current = assignments.find(isActive)

  if (current) {
    const summary = toSummary(MEMBERSHIP_STATES.ACTIVE, current, planNames, todayStart)
    if (summary.daysLeft <= EXPIRING_THRESHOLD_DAYS) {
      summary.state = MEMBERSHIP_STATES.EXPIRING
    }
    return summary
  }

  const upcoming = assignments.find((a) => a.status === 'active' && a.startDate > todayStart)
  if (upcoming) {
    return toSummary(MEMBERSHIP_STATES.UPCOMING, upcoming, planNames, todayStart)
  }

  const last = assignments[0]
  const state = last.status === 'cancelled' ? MEMBERSHIP_STATES.CANCELLED : MEMBERSHIP_STATES.EXPIRED
  return toSummary(state, last, planNames, todayStart)
}

// Devuelve { [clientId]: { membership, lastVisitAt } } para pintar contexto operativo en listados.
export const getClientsOperationalContext = async (clientIds) => {
  if (!clientIds.length) {
    return {}
  }

  const todayStart = dayjs().startOf('day').toDate()

  const [assignments, lastVisits] = await Promise.all([
    // Los cargos únicos (p. ej. Inscripción) no tienen endDate ni dan acceso: no son membresía.
    SubscriptionAssignment.find({ clientId: { $in: clientIds }, endDate: { $ne: null } })
      .select('clientId planId startDate endDate status')
      .sort({ endDate: -1 })
      .lean(),
    Visit.aggregate([
      { $match: { clientId: { $in: clientIds } } },
      { $group: { _id: '$clientId', lastVisitAt: { $max: '$createdAt' } } },
    ]),
  ])

  const planIds = [...new Set(assignments.map((a) => a.planId).filter(Boolean))]
  const plans = planIds.length
    ? await Subscription.find({ _id: { $in: planIds } }).select('name').lean()
    : []
  const planNames = new Map(plans.map((plan) => [plan._id, plan.name]))

  const assignmentsByClient = new Map()
  for (const assignment of assignments) {
    const list = assignmentsByClient.get(assignment.clientId) ?? []
    list.push(assignment)
    assignmentsByClient.set(assignment.clientId, list)
  }
  const lastVisitByClient = new Map(lastVisits.map((visit) => [visit._id, visit.lastVisitAt]))

  return Object.fromEntries(
    clientIds.map((clientId) => [
      clientId,
      {
        membership: resolveMembership(assignmentsByClient.get(clientId) ?? [], planNames, todayStart),
        lastVisitAt: lastVisitByClient.get(clientId) ?? null,
      },
    ])
  )
}
