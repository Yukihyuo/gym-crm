import express from "express"
import CashCut from "../models/CashCut.js"

const router = express.Router()

const OPEN_STATUSES = ['pending', 'incomplete']

const isOpenCashCut = (status) => OPEN_STATUSES.includes(status)

const mergeSystemTotals = (current = {}, incoming = {}) => {
	const byMethod = {
		cash: incoming?.byMethod?.cash ?? current?.byMethod?.cash ?? 0,
		transfer: incoming?.byMethod?.transfer ?? current?.byMethod?.transfer ?? 0,
		card: incoming?.byMethod?.card ?? current?.byMethod?.card ?? 0,
	}

	const byCategory = {
		products: incoming?.byCategory?.products ?? current?.byCategory?.products ?? 0,
		subscriptions: incoming?.byCategory?.subscriptions ?? current?.byCategory?.subscriptions ?? 0,
	}

	const computedGrandTotal = byMethod.cash + byMethod.transfer + byMethod.card

	return {
		byMethod,
		byCategory,
		grandTotal: incoming?.grandTotal ?? computedGrandTotal,
	}
}

const mergeReportedTotals = (current = {}, incoming = {}) => ({
	cashInHand: incoming?.cashInHand ?? current?.cashInHand ?? 0,
	transferReceipts: incoming?.transferReceipts ?? current?.transferReceipts ?? 0,
	cardSlips: incoming?.cardSlips ?? current?.cardSlips ?? 0,
})

const uniqueIds = (...values) => [...new Set(values.flat().filter(Boolean))]

const calculateCashDifference = (initialCash, systemTotals, reportedTotals) => {
	const expectedCash = (systemTotals?.byMethod?.cash ?? 0) + (initialCash ?? 0)
	const cashInHand = reportedTotals?.cashInHand ?? 0

	return cashInHand - expectedCash
}

const resolveClosedStatus = (cashDifference) => {
	if (cashDifference === 0) {
		return 'balanced'
	}

	if (cashDifference < 0) {
		return 'shortage'
	}

	return 'surplus'
}

// POST - Abrir caja
router.post('/open', async (req, res) => {
	try {
		const {  staffId, brandId, initialCash = 0 } = req.body

		if (!staffId) {
			return res.status(400).json({
				message: 'staffId es requerido'
			})
		}

		const existingOpenCashCut = await CashCut.findOne({
			staffId: staffId,
      brandId: brandId,
			status: { $in: OPEN_STATUSES }
		}).sort({ createdAt: -1 })

		if (existingOpenCashCut) {
			return res.status(400).json({
				message: 'El usuario ya tiene una caja abierta',
				cashCut: existingOpenCashCut
			})
		}

		const cashCut = new CashCut({
			staffId: staffId,
      brandId: brandId,
			openingDate: new Date(),
			closingDate: null,
			initialCash,
			systemTotals: {
				byMethod: {
					cash: 0,
					transfer: 0,
					card: 0,
				},
				byCategory: {
					products: 0,
					subscriptions: 0,
				},
				grandTotal: 0,
			},
			reportedTotals: {
				cashInHand: initialCash,
				transferReceipts: 0,
				cardSlips: 0,
			},
			cashDifference: 0,
			status: 'pending',
			salesIds: [],
			subscriptionAssignmentIds: [],
			notes:"",
		})

		await cashCut.save()

		res.status(201).json({
			message: 'Caja abierta exitosamente',
			cashCut,
		})
	} catch (error) {
		console.error('Error en open cash cut:', error)
		res.status(500).json({
			message: 'Error al abrir la caja',
			error: error.message,
		})
	}
})

// POST - Cerrar caja
router.post('/close/:id', async (req, res) => {
	try {
		const { id } = req.params
		const { reportedTotals, notes, closingDate } = req.body

		const cashCut = await CashCut.findById(id)

		if (!cashCut) {
			return res.status(404).json({
				message: 'Corte de caja no encontrado'
			})
		}

		if (!isOpenCashCut(cashCut.status)) {
			return res.status(400).json({
				message: 'El corte de caja ya fue cerrado'
			})
		}

		if (!reportedTotals || reportedTotals.cashInHand === undefined) {
			return res.status(400).json({
				message: 'reportedTotals.cashInHand es requerido para cerrar la caja'
			})
		}

		const nextSystemTotals = mergeSystemTotals(cashCut.systemTotals)
		const nextReportedTotals = mergeReportedTotals(cashCut.reportedTotals, reportedTotals)
		const cashDifference = calculateCashDifference(cashCut.initialCash, nextSystemTotals, nextReportedTotals)

		cashCut.systemTotals = nextSystemTotals
		cashCut.reportedTotals = nextReportedTotals
		cashCut.cashDifference = cashDifference
		cashCut.status = resolveClosedStatus(cashDifference)
		cashCut.closingDate = closingDate ? new Date(closingDate) : new Date()

		if (notes !== undefined) {
			cashCut.notes = notes
		}

		await cashCut.save()

		res.status(200).json({
			message: 'Caja cerrada exitosamente',
			cashCut,
		})
	} catch (error) {
		console.error('Error en close cash cut:', error)
		res.status(500).json({
			message: 'Error al cerrar la caja',
			error: error.message,
		})
	}
})

// PATCH - Actualizar corte en curso
router.patch('/update/:id', async (req, res) => {
	try {
		const { id } = req.params
		const {
			systemTotals,
			reportedTotals,
			saleId,
			salesIds,
			subscriptionAssignmentId,
			subscriptionAssignmentIds,
			notes,
			status,
		} = req.body

		const cashCut = await CashCut.findById(id)

		if (!cashCut) {
			return res.status(404).json({
				message: 'Corte de caja no encontrado'
			})
		}

		if (!isOpenCashCut(cashCut.status)) {
			return res.status(400).json({
				message: 'Solo se pueden modificar cortes de caja abiertos'
			})
		}

		if (systemTotals) {
			cashCut.systemTotals = mergeSystemTotals(cashCut.systemTotals, systemTotals)
		}

		if (reportedTotals) {
			cashCut.reportedTotals = mergeReportedTotals(cashCut.reportedTotals, reportedTotals)
		}

		if (systemTotals || reportedTotals) {
			cashCut.cashDifference = calculateCashDifference(
				cashCut.initialCash,
				cashCut.systemTotals,
				cashCut.reportedTotals
			)
		}

		const nextSalesIds = uniqueIds(cashCut.salesIds, salesIds, saleId)
		const nextSubscriptionAssignmentIds = uniqueIds(
			cashCut.subscriptionAssignmentIds,
			subscriptionAssignmentIds,
			subscriptionAssignmentId
		)

		cashCut.salesIds = nextSalesIds
		cashCut.subscriptionAssignmentIds = nextSubscriptionAssignmentIds

		if (notes !== undefined) {
			cashCut.notes = notes
		}

		if (status && OPEN_STATUSES.includes(status)) {
			cashCut.status = status
		}

		await cashCut.save()

		res.status(200).json({
			message: 'Corte de caja actualizado exitosamente',
			cashCut,
		})
	} catch (error) {
		console.error('Error en update cash cut:', error)
		res.status(500).json({
			message: 'Error al actualizar el corte de caja',
			error: error.message,
		})
	}
})

// GET - Obtener corte abierto por usuario
router.get('/open/:userId', async (req, res) => {
	try {
		const { userId } = req.params

		const cashCut = await CashCut.findOne({
			userId,
			status: { $in: OPEN_STATUSES }
		}).sort({ createdAt: -1 })

		if (!cashCut) {
			return res.status(404).json({
				message: 'No hay una caja abierta para este usuario'
			})
		}

		res.status(200).json({
			message: 'Caja abierta obtenida exitosamente',
			cashCut,
		})
	} catch (error) {
		console.error('Error en get open cash cut:', error)
		res.status(500).json({
			message: 'Error al obtener la caja abierta',
			error: error.message,
		})
	}
})

// GET - Obtener todos los cortes
router.get('/getAll', async (req, res) => {
	try {
		const { userId, status } = req.query
		const filters = {}

		if (userId) {
			filters.userId = userId
		}

		if (status) {
			filters.status = status
		}

		const cashCuts = await CashCut.find(filters).sort({ createdAt: -1 })

		res.status(200).json({
			message: 'Cortes de caja obtenidos exitosamente',
			count: cashCuts.length,
			cashCuts,
		})
	} catch (error) {
		console.error('Error en getAll cash cuts:', error)
		res.status(500).json({
			message: 'Error al obtener los cortes de caja',
			error: error.message,
		})
	}
})

// GET - Obtener corte por id
router.get('/getById/:id', async (req, res) => {
	try {
		const { id } = req.params
		const cashCut = await CashCut.findById(id)

		if (!cashCut) {
			return res.status(404).json({
				message: 'Corte de caja no encontrado'
			})
		}

		res.status(200).json({
			message: 'Corte de caja obtenido exitosamente',
			cashCut,
		})
	} catch (error) {
		console.error('Error en getById cash cut:', error)
		res.status(500).json({
			message: 'Error al obtener el corte de caja',
			error: error.message,
		})
	}
})

// DELETE - Eliminar corte por id
router.delete('/delete/:id', async (req, res) => {
	try {
		const { id } = req.params
		const cashCut = await CashCut.findByIdAndDelete(id)

		if (!cashCut) {
			return res.status(404).json({
				message: 'Corte de caja no encontrado'
			})
		}

		res.status(200).json({
			message: 'Corte de caja eliminado exitosamente',
			cashCut,
		})
	} catch (error) {
		console.error('Error en delete cash cut:', error)
		res.status(500).json({
			message: 'Error al eliminar el corte de caja',
			error: error.message,
		})
	}
})

// Helper function to update cash cut with new document (sale or subscription assignment)
// Handles null/undefined cashCutId internally without throwing errors
export const updateCashCutWithDocument = async (cashCutId, documentType, documentId, documentData) => {
	// Manejar null/undefined internamente, sin propagar errores
	if (!cashCutId || !documentId) return null

	try {
		const cashCut = await CashCut.findById(cashCutId)
		if (!cashCut) return null

		// Determinar el método de pago y el monto según el tipo de documento
		let paymentMethod = 'cash'
		let amount = 0
		let categoryField = 'products'

		if (documentType === 'sale') {
			paymentMethod = documentData?.payment?.method || 'cash'
			amount = documentData?.totals?.total || 0
			categoryField = 'products'

			// Agregar a salesIds si no existe
			if (!cashCut.salesIds.includes(documentId)) {
				cashCut.salesIds.push(documentId)
			}
		} else if (documentType === 'subscription') {
			paymentMethod = documentData?.paymentMethod || 'cash'
			amount = documentData?.pricePaid || 0
			categoryField = 'subscriptions'

			// Agregar a subscriptionAssignmentIds si no existe
			if (!cashCut.subscriptionAssignmentIds.includes(documentId)) {
				cashCut.subscriptionAssignmentIds.push(documentId)
			}
		}

		// Actualizar systemTotals si hay monto válido
		if (amount > 0) {
			// Actualizar byMethod
			if (paymentMethod && cashCut.systemTotals.byMethod.hasOwnProperty(paymentMethod)) {
				cashCut.systemTotals.byMethod[paymentMethod] =
					(cashCut.systemTotals.byMethod[paymentMethod] || 0) + amount
			}

			// Actualizar byCategory
			if (cashCut.systemTotals.byCategory.hasOwnProperty(categoryField)) {
				cashCut.systemTotals.byCategory[categoryField] =
					(cashCut.systemTotals.byCategory[categoryField] || 0) + amount
			}

			// Recalcular grandTotal sumando los métodos de pago
			cashCut.systemTotals.grandTotal =
				(cashCut.systemTotals.byMethod.cash || 0) +
				(cashCut.systemTotals.byMethod.transfer || 0) +
				(cashCut.systemTotals.byMethod.card || 0)
		}

		await cashCut.save()
		return cashCut
	} catch (error) {
		console.error(`Error updating cash cut ${cashCutId}:`, error)
		return null // No propagar el error, solo retornar null
	}
}

export const routeConfig = { path: "/v1/cash-cuts", router }