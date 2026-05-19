
import Client from "../models/Client.js"
import Visit from "../models/Visit.js"
import SubscriptionAssignment from "../models/SubscriptionAssignment.js"
import Subscription from "../models/Subscription.js"
import dayjs from "dayjs"

const buildAccessResult = ({ kind, title, message, client = null, membership = null, daysPending = null, details = [] }) => {
  return {
    kind,
    title,
    message,
    client,
    membership,
    daysPending,
    details,
  }
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
      payload: buildAccessResult({
        kind: 'error',
        title: 'Acceso denegado',
        message: 'El cliente no tiene una suscripción activa',
        details: [
          { label: 'Motivo', value: 'Suscripción inactiva' },
        ],
      })
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