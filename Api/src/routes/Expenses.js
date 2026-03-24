import express from "express"
import Expense from "../models/Expense.js"
import Staff from "../models/Staff.js"
import Store from "../models/Store.js"
import { linkExpenseToCashCut } from "./CashCuts.js"

const router = express.Router()

const getBrandId = (req) => req.body.brandId || req.headers['x-brand-id']
const getStoreId = (req) => req.body.storeId || req.headers['x-store-id']
const getCashCutId = (req) => req.body.cashCutId || req.headers['x-cash-cut-id']

const validateStore = async (storeId) => {
	if (!storeId) return null
	return Store.findById(storeId)
}

const validateUser = async (userId) => {
	if (!userId) return null
	return Staff.findById(userId)
}

router.get('/', (req, res) => {
  console.log(1)
  res.json({ message: 'Expenses API is working' })
})

router.post('/create', async (req, res) => {
	try {
		const brandId = getBrandId(req)
		const storeId = getStoreId(req)
		const cashCutId = getCashCutId(req)
		const {
			userId,
			amount,
			category = 'other',
			description,
			source,
			date,
			linkToCashCut = false,
		} = req.body

		if (!brandId) {
			return res.status(400).json({ message: 'brandId es requerido' })
		}

		if (!storeId) {
			return res.status(400).json({ message: 'storeId es requerido' })
		}

		if (!userId) {
			return res.status(400).json({ message: 'userId es requerido' })
		}

		if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
			return res.status(400).json({ message: 'amount es requerido y debe ser numérico' })
		}

		if (Number(amount) < 0) {
			return res.status(400).json({ message: 'amount no puede ser negativo' })
		}

		if (!source) {
			return res.status(400).json({ message: 'source es requerido' })
		}

		if (linkToCashCut && !cashCutId) {
			return res.status(400).json({ message: 'cashCutId es requerido cuando linkToCashCut es true' })
		}

		const [store, user] = await Promise.all([
			validateStore(storeId),
			validateUser(userId),
		])

		if (!store) {
			return res.status(404).json({ message: 'Tienda no encontrada' })
		}

		if (store.brandId !== brandId) {
			return res.status(400).json({ message: 'La tienda no pertenece a la marca activa' })
		}

		if (!user) {
			return res.status(404).json({ message: 'Usuario no encontrado' })
		}

		const expense = new Expense({
			brandId,
			storeId,
			userId,
			amount: Number(amount),
			category,
			description,
			source,
			date: date ? new Date(date) : new Date(),
		})

		await expense.save()

		let cashCutLinked = false

		if (linkToCashCut) {
			const linkedCashCut = await linkExpenseToCashCut(cashCutId, expense._id)

			if (!linkedCashCut) {
				await Expense.findByIdAndDelete(expense._id)
				return res.status(500).json({ message: 'No se pudo vincular el gasto al corte de caja' })
			}

			cashCutLinked = true
		}

		const populatedExpense = await Expense.findById(expense._id)
			.populate('userId', 'username email profile.names profile.lastNames')
			.populate('storeId', 'name')

		return res.status(201).json({
			message: 'Gasto creado exitosamente',
			expense: populatedExpense,
			cashCutLinked,
		})
	} catch (error) {
		console.error('Error al crear gasto:', error)
		return res.status(500).json({
			message: 'Error al crear gasto',
			error: error.message,
		})
	}
})

router.get('/getAll', async (req, res) => {
  console.log(123)
	try {
		const brandId = req.headers['x-brand-id'] || req.query.brandId
		const storeId = req.headers['x-store-id'] || req.query.storeId
		const { category, source, startDate, endDate } = req.query

		if (!brandId) {
			return res.status(400).json({ message: 'brandId es requerido' })
		}

		if (!storeId) {
			return res.status(400).json({ message: 'storeId es requerido' })
		}

		const filters = { brandId, storeId }

		if (category) {
			filters.category = category
		}

		if (source) {
			filters.source = source
		}

		if (startDate || endDate) {
			filters.date = {}
			if (startDate) filters.date.$gte = new Date(startDate)
			if (endDate) filters.date.$lte = new Date(endDate)
		}

		const expenses = await Expense.find(filters)
			.populate('userId', 'username email profile.names profile.lastNames')
			.populate('storeId', 'name')
			.sort({ date: -1, createdAt: -1 })

		return res.status(200).json({
			message: 'Gastos obtenidos exitosamente',
			count: expenses.length,
			expenses,
		})
	} catch (error) {
		console.error('Error al obtener gastos:', error)
		return res.status(500).json({
			message: 'Error al obtener gastos',
			error: error.message,
		})
	}
})

router.get('/getById/:id', async (req, res) => {
	try {
		const { id } = req.params
		const brandId = req.headers['x-brand-id'] || req.query.brandId
		const storeId = req.headers['x-store-id'] || req.query.storeId

		const expense = await Expense.findOne({ _id: id, brandId, storeId })
			.populate('userId', 'username email profile.names profile.lastNames')
			.populate('storeId', 'name')

		if (!expense) {
			return res.status(404).json({ message: 'Gasto no encontrado' })
		}

		return res.status(200).json({
			message: 'Gasto obtenido exitosamente',
			expense,
		})
	} catch (error) {
		console.error('Error al obtener gasto:', error)
		return res.status(500).json({
			message: 'Error al obtener gasto',
			error: error.message,
		})
	}
})

router.put('/update/:id', async (req, res) => {
	try {
		const { id } = req.params
		const brandId = getBrandId(req)
		const storeId = getStoreId(req)
		const { userId, amount, category, description, source, date } = req.body

		const expense = await Expense.findOne({ _id: id, brandId, storeId })

		if (!expense) {
			return res.status(404).json({ message: 'Gasto no encontrado' })
		}

		if (userId !== undefined) {
			const user = await validateUser(userId)
			if (!user) {
				return res.status(404).json({ message: 'Usuario no encontrado' })
			}
			expense.userId = userId
		}

		if (amount !== undefined) {
			if (Number.isNaN(Number(amount)) || Number(amount) < 0) {
				return res.status(400).json({ message: 'amount debe ser numérico y no negativo' })
			}
			expense.amount = Number(amount)
		}

		if (category !== undefined) expense.category = category
		if (description !== undefined) expense.description = description
		if (source !== undefined) expense.source = source
		if (date !== undefined) expense.date = new Date(date)

		await expense.save()

		const updatedExpense = await Expense.findById(expense._id)
			.populate('userId', 'username email profile.names profile.lastNames')
			.populate('storeId', 'name')

		return res.status(200).json({
			message: 'Gasto actualizado exitosamente',
			expense: updatedExpense,
		})
	} catch (error) {
		console.error('Error al actualizar gasto:', error)
		return res.status(500).json({
			message: 'Error al actualizar gasto',
			error: error.message,
		})
	}
})

router.delete('/delete/:id', async (req, res) => {
	try {
		const { id } = req.params
		const brandId = req.headers['x-brand-id'] || req.query.brandId
		const storeId = req.headers['x-store-id'] || req.query.storeId

		const expense = await Expense.findOneAndDelete({ _id: id, brandId, storeId })

		if (!expense) {
			return res.status(404).json({ message: 'Gasto no encontrado' })
		}

		return res.status(200).json({
			message: 'Gasto eliminado exitosamente',
			expense,
		})
	} catch (error) {
		console.error('Error al eliminar gasto:', error)
		return res.status(500).json({
			message: 'Error al eliminar gasto',
			error: error.message,
		})
	}
})

export const routeConfig = { path: "/v1/expenses", router }