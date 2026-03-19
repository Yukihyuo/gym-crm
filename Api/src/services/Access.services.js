
import Client from "../models/Client.js"
import Visit from "../models/Visit.js"
import SubscriptionAssignment from "../models/SubscriptionAssignment.js"
import Subscription from "../models/Subscription.js"
import dayjs from "dayjs"

export const registerVisit = async (client, method) => {
  const sub = await SubscriptionAssignment.findOne({
    clientId: client._id,
    endDate: { $gte: dayjs().startOf('day').toDate() },
    status: 'active'
  })


  if (!sub) {
    return {
      ok: false,
      status: 403,
      payload: {
        message: 'El cliente no tiene una suscripción activa'
      }
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
    payload: {
      message: 'Acceso concedido',
      client: `${client.profile.names} ${client.profile.lastNames}`,
      membership: membership || null,
      daysPending: dayjs(sub.endDate).diff(dayjs(), 'day'),
      success: true,
    }
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
      { 'profile.phone': { $in: phoneCandidates } }
    ]
  }).lean()
}