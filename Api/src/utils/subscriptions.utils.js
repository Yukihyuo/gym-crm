import dayjs from 'dayjs'

import Client from '../models/Client.js'
import Store from '../models/Store.js'
import Subscription from '../models/Subscription.js'
import SubscriptionAssignment from '../models/SubscriptionAssignment.js'

export const buildSubscriptionsError = (message, statusCode = 400) => {
	const error = new Error(message)
	error.statusCode = statusCode
	return error
}

export const calculateEndDate = (startDate, duration) => {
	const value = Number(duration?.value || 0)
	const unit = duration?.unit || 'months'

	if (value < 0) return null

	// Duración 0: suscripción sin vencimiento.
	if (value === 0) return null

	if (unit === 'days' && value === 1) {
		return dayjs(startDate).endOf('day').toDate()
	}

	return dayjs(startDate)
		.add(value, unit)
		.endOf('day')
		.toDate()
}

export const getLatestActiveAssignment = async (clientId) => {
	const todayStart = dayjs().startOf('day').toDate()

	return SubscriptionAssignment.findOne({
		clientId,
		status: 'active',
		endDate: { $gte: todayStart }
	}).sort({ endDate: -1, createdAt: -1 })
}

export const resolveNextAssignmentDates = async (clientId, planDuration) => {
	const latestActiveAssignment = await getLatestActiveAssignment(clientId)
	const todayStart = dayjs().startOf('day').toDate()
	const durationValue = Number(planDuration?.value || 0)

	const startDate = latestActiveAssignment?.endDate
		? dayjs(latestActiveAssignment.endDate).add(1, 'day').startOf('day').toDate()
		: todayStart

	const endDate = calculateEndDate(startDate, planDuration)

	if (durationValue < 0) {
		throw buildSubscriptionsError('La duración de la membresía es inválida', 400)
	}

	return {
		startDate,
		endDate,
		queued: Boolean(latestActiveAssignment?.endDate)
	}
}

export const getAssignmentEntities = async ({ clientId, storeId, planId }) => {
	const [client, store, plan] = await Promise.all([
		Client.findById(clientId),
		Store.findById(storeId),
		Subscription.findById(planId)
	])

	if (!client) {
		throw buildSubscriptionsError('Cliente no encontrado', 404)
	}

	if (!store) {
		throw buildSubscriptionsError('Tienda no encontrada', 404)
	}

	if (!plan) {
		throw buildSubscriptionsError('Membresía no encontrada', 404)
	}

	if (client.brandId !== store.brandId || plan.brandId !== store.brandId) {
		throw buildSubscriptionsError('Cliente, tienda y membresía deben pertenecer a la misma marca', 400)
	}

	return { client, store, plan }
}

export const createSubscriptionAssignment = async ({ clientId, storeId, planId, paymentMethod = 'cash', status = 'active' }) => {
	if (!clientId || !storeId || !planId || !paymentMethod) {
		throw buildSubscriptionsError('Faltan datos requeridos: clientId, storeId, planId, paymentMethod', 400)
	}

	const { store, plan } = await getAssignmentEntities({ clientId, storeId, planId })
	const { startDate, endDate, queued } = await resolveNextAssignmentDates(clientId, plan.duration)

	const assignment = await SubscriptionAssignment.create({
		brandId: store.brandId,
		storeId,
		clientId,
		planId,
		startDate,
		endDate,
		pricePaid: Number(plan.price?.amount || 0),
		paymentMethod,
		status
	})

	return { assignment, queued }
}

export const populateAssignmentQuery = (query, includePlanDetails = false) => {
	query
		.populate({ path: 'clientId', select: 'profile.names profile.lastNames email' })
		.populate({ path: 'storeId', select: 'name' })

	if (includePlanDetails) {
		return query.populate({ path: 'planId', select: 'name status duration price' })
	}

	return query.populate({ path: 'planId', select: 'name status' })
}

export const findPopulatedAssignmentById = (assignmentId, includePlanDetails = false) => {
	return populateAssignmentQuery(SubscriptionAssignment.findById(assignmentId), includePlanDetails)
}

export const validateAssignmentEditableRefs = async ({ storeId, planId, assignmentBrandId }) => {
	let resolvedStore = null
	let resolvedPlan = null

	if (storeId !== undefined) {
		resolvedStore = await Store.findById(storeId)
		if (!resolvedStore) {
			throw buildSubscriptionsError('Tienda no encontrada', 404)
		}

		if (resolvedStore.brandId !== assignmentBrandId) {
			throw buildSubscriptionsError('La tienda debe pertenecer a la misma marca de la asignación', 400)
		}
	}

	if (planId !== undefined) {
		resolvedPlan = await Subscription.findById(planId)
		if (!resolvedPlan) {
			throw buildSubscriptionsError('Membresía no encontrada', 404)
		}

		if (resolvedPlan.brandId !== assignmentBrandId) {
			throw buildSubscriptionsError('La membresía debe pertenecer a la misma marca de la asignación', 400)
		}
	}

	return { resolvedStore, resolvedPlan }
}
