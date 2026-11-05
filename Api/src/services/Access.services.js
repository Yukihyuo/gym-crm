
import Client from "../models/Client.js"
import Visit from "../models/Visit.js"
import SubscriptionAssignment from "../models/SubscriptionAssignment.js"
import Subscription from "../models/Subscription.js"
import dayjs from "dayjs"

export const ACCESS_DENIED_NO_SUBSCRIPTION = 'NO_ACTIVE_SUBSCRIPTION'

const DATE_FORMAT = 'DD/MM/YYYY'

const buildAccessResult = ({
  kind,
  title,
  message,
  code = null,
  clientId = null,
  client = null,
  membership = null,
  lastMembership = null,
  daysPending = null,
  details = [],
}) => {
  return {
    kind,
    title,
    message,
    code,
    clientId,
    client,
    membership,
    lastMembership,
    daysPending,
    details,
  }
}

const describeDenialReason = (lastAssignment) => {
  if (!lastAssignment) {
    return 'Sin membresía registrada'
  }

  if (lastAssignment.status === 'cancelled') {
    return 'Membresía cancelada'
  }

  if (dayjs(lastAssignment.endDate).isBefore(dayjs())) {
    return `Venció el ${dayjs(lastAssignment.endDate).format(DATE_FORMAT)}`
  }

  return `Inicia el ${dayjs(lastAssignment.startDate).format(DATE_FORMAT)}`
}

// Entrega al front lo necesario para resolver el rechazo (quién es y cuál fue su último plan).
const buildNoSubscriptionResult = async (client) => {
  const clientName = `${client.profile?.names ?? ''} ${client.profile?.lastNames ?? ''}`.trim()
  const lastAssignment = await SubscriptionAssignment.findOne({ clientId: client._id })
    .sort({ endDate: -1 })
    .lean()
  const lastPlan = lastAssignment?.planId
    ? await Subscription.findById(lastAssignment.planId).select('name').lean()
    : null

  const lastMembership = lastAssignment
    ? {
        planId: lastAssignment.planId ?? null,
        name: lastPlan?.name ?? null,
        endDate: lastAssignment.endDate ?? null,
      }
    : null

  const details = [
    { label: 'Cliente', value: clientName || 'No disponible' },
    { label: 'Motivo', value: describeDenialReason(lastAssignment) },
  ]

  if (lastMembership?.name) {
    details.push({ label: 'Último plan', value: lastMembership.name })
  }

  return buildAccessResult({
    kind: 'error',
    title: 'Acceso denegado',
    message: 'El cliente no tiene una suscripción activa',
    code: ACCESS_DENIED_NO_SUBSCRIPTION,
    clientId: client._id,
    client: clientName || null,
    lastMembership,
    details,
  })
}

export const registerVisit = async (client, method) => {
  const todayStart = dayjs().startOf('day').toDate()

  const sub = await SubscriptionAssignment.findOne({
    clientId: client._id,
    startDate: { $lte: todayStart },
    endDate: { $gte: todayStart },
    status: 'active'
  })


  if (!sub) {
    return {
      ok: false,
      status: 403,
      payload: await buildNoSubscriptionResult(client)
    }
  }


  await Visit.create({
    brandId: client.brandId,
    storeId: client.storeId,
    clientId: client._id,
    accessMethod: method,
    isTrial: sub.isTrial
  })

  const membership = await Subscription.findById(sub.planId).lean()
  console.log('membership', membership)

  return {
    ok: true,
    status: 200,
    payload: buildAccessResult({
      kind: 'success',
      title: 'Acceso concedido',
      message: 'Se registró el acceso correctamente para el cliente.',
      client: `${client.profile.names} ${client.profile.lastNames}`,
      membership: membership || null,
      daysPending: dayjs(sub.endDate).diff(dayjs(), 'day'),
      details: [
        { label: 'Cliente', value: `${client.profile.names} ${client.profile.lastNames}` },
        { label: 'Plan', value: membership?.name ?? 'No disponible' },
        { label: 'Vigencia', value: `${dayjs(sub.endDate).diff(dayjs(), 'day')} días` },
      ],
    })
  }
}

export const findClientByIdentifier = async (identifier) => {
  if (!identifier || typeof identifier !== 'string') {
    return null
  }

  const value = identifier.trim()
  if (!value) {
    return null
  }

  const normalizedPhone = value.replace(/\D/g, '')
  const phoneCandidates = [value]

  if (normalizedPhone && normalizedPhone !== value) {
    phoneCandidates.push(normalizedPhone)
  }

  return Client.findOne({
    $or: [
      { _id: value },
      { username: value },
      { email: value.toLowerCase() },
      { accessCode: value },
      { 'profile.phone': { $in: phoneCandidates } }
    ]
  }).lean()
}