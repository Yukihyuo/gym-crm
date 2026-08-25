import Client from '../models/Client.js'
import Store from '../models/Store.js'
import bcrypt from 'bcrypt'

import { sendWelcomeEmail } from '../emails/email.handler.js'
import Brand from '../models/Brand.js'
import { getBrandSettings } from './brand.utils.js'
import { buildSubscriptionsError, createSubscriptionAssignment, getAssignmentEntities } from './subscriptions.utils.js'

export const normalizeClientCreateInput = (payload = {}) => {
  const {
    email,
    accessCode: requestedAccessCode,
    storeId,
    profile,
    username: requestedUsername
  } = payload

  return {
    storeId,
    profile,
    requestedUsername,
    normalizedEmail: typeof email === 'string' ? email.trim().toLowerCase() : '',
    normalizedAccessCode: typeof requestedAccessCode === 'string' ? requestedAccessCode.trim() : '',
    normalizedPhone: typeof profile?.phone === 'string' ? profile.phone.trim() : ''
  }
}

export const validateRequiredClientFields = ({ storeId, profile }) => {
  if (!storeId || !profile?.names || !profile?.lastNames) {
    throw buildSubscriptionsError('ID de tienda, nombres y apellidos son requeridos', 400)
  }
}

export const getStoreOrThrow = async (storeId) => {
  const store = await Store.findById(storeId)

  if (!store) {
    throw buildSubscriptionsError('Tienda no encontrada', 404)
  }

  return store
}

export const ensureEmailUnique = async (normalizedEmail) => {
  if (!normalizedEmail) return

  const existingClient = await Client.findOne({ email: normalizedEmail })
  if (existingClient) {
    throw buildSubscriptionsError('El email ya está registrado', 400)
  }
}

export const resolveUsername = ({ requestedUsername, normalizedEmail }) => {
  const username = typeof requestedUsername === 'string' && requestedUsername.trim()
    ? requestedUsername.trim()
    : normalizedEmail ? normalizedEmail.split('@')[0] : ''

  if (!username) {
    throw buildSubscriptionsError('Username inválido. Si no envías username, debes enviar un email válido.', 400)
  }

  return username
}

export const ensureUsernameUnique = async (username) => {
  const existingUsername = await Client.findOne({ username })

  if (existingUsername) {
    throw buildSubscriptionsError('El username ya existe. Use uno diferente.', 400)
  }
}

export const resolveAccessCode = async ({ normalizedAccessCode, brandId, generateRandomValue }) => {
  if (normalizedAccessCode) {
    const existingCode = await Client.findOne({ brandId, accessCode: normalizedAccessCode })
    if (existingCode) {
      throw buildSubscriptionsError('El accessCode ya existe en esta marca. Use uno diferente.', 400)
    }
    return normalizedAccessCode
  }

  let generatedCode = ''
  let collision = true

  while (collision) {
    generatedCode = generateRandomValue(4)
    const existingCode = await Client.findOne({ brandId, accessCode: generatedCode })
    collision = Boolean(existingCode)
  }

  return generatedCode
}

export const resolveDefaultPassword = ({ username, normalizedEmail, normalizedAccessCode, generateRandomValue }) => {
  if (!normalizedEmail && !normalizedAccessCode) {
    return generateRandomValue(6)
  }

  if (!normalizedEmail && normalizedAccessCode) {
    return normalizedAccessCode
  }

  return username
}

export const buildClientCreatePayload = ({ store, username, accessCode, normalizedEmail, normalizedPhone, profile, hashedPassword }) => ({
  brandId: store.brandId,
  storeId: store._id,
  username,
  accessCode,
  email: normalizedEmail || undefined,
  password: hashedPassword,
  profile: {
    names: profile.names,
    lastNames: profile.lastNames,
    phone: normalizedPhone || undefined
  }
})

export const createClientRegistrationFeeAssignment = async ({ clientId, storeId, brandId }) => {
  const brandSettings = await getBrandSettings(brandId)

  if (!brandSettings?.requiresRegistrationFee || !brandSettings?.registrationFeeId) {
    return null
  }

  await getAssignmentEntities({
    clientId,
    storeId,
    planId: brandSettings.registrationFeeId
  })

  const { assignment } = await createSubscriptionAssignment({
    clientId,
    storeId,
    planId: brandSettings.registrationFeeId,
    paymentMethod: 'cash'
  })

  return assignment
}

export const sendWelcomeEmailSafely = async ({ client, brandId, normalizedEmail }) => {
  let welcomeEmailSent = false

  try {
    const brand = await Brand.findById(brandId)
    if (brand && normalizedEmail) {
      await sendWelcomeEmail(client, brand)
      welcomeEmailSent = true
    }
  } catch (error) {
    console.error('Error enviando email de bienvenida:', error)
  }

  return welcomeEmailSent
}

export const getClientByIdOrThrow = async (clientId) => {
  const client = await Client.findById(clientId)

  if (!client) {
    throw buildSubscriptionsError('Cliente no encontrado', 404)
  }

  return client
}

export const getClientForLoginOrThrow = async (username) => {
  const client = await Client.findOne({
    $or: [{ username }, { email: username }]
  })

  if (!client) {
    throw buildSubscriptionsError('Credenciales inválidas', 401)
  }

  return client
}

export const ensureClientIsActiveOrThrow = (client) => {
  if (!client?.status) {
    throw buildSubscriptionsError('Cliente inactivo', 403)
  }
}

export const ensurePasswordMatchesOrThrow = async ({ plainPassword, hashedPassword, invalidMessage }) => {
  const isPasswordValid = await bcrypt.compare(plainPassword, hashedPassword)

  if (!isPasswordValid) {
    throw buildSubscriptionsError(invalidMessage, 401)
  }
}

export const ensureDifferentPasswordOrThrow = async ({ newPassword, hashedPassword }) => {
  const isSamePassword = await bcrypt.compare(newPassword, hashedPassword)

  if (isSamePassword) {
    throw buildSubscriptionsError('La nueva contraseña debe ser diferente a la actual', 400)
  }
}

export const ensureEmailUpdateIsUnique = async ({ email, id }) => {
  const existingEmail = await Client.findOne({ email, _id: { $ne: id } })

  if (existingEmail) {
    throw buildSubscriptionsError('El email ya está en uso', 400)
  }
}

export const ensureDerivedUsernameIsUnique = async ({ username, id }) => {
  const existingUsername = await Client.findOne({ username, _id: { $ne: id } })

  if (existingUsername) {
    throw buildSubscriptionsError('El username derivado del email ya existe', 400)
  }
}

export const buildClientResponse = (client) => ({
  id: client._id,
  username: client.username,
  email: client.email,
  profile: client.profile,
  status: client.status,
  brandId: client.brandId,
  storeId: client.storeId,
  accessCode: client.accessCode,
})
