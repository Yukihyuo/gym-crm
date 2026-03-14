import express from "express"

import Diet from "../models/Diet.js"

import clientServices from "../services/Clients.services.js"

const router = express.Router()



// Create - Crear una nueva dieta para un cliente
router.post('/create', async (req, res) => {
	try {
		const { clientId, title, plan } = req.body

		if (!clientId || !title) {
			return res.status(400).json({
				message: 'clientId y title son requeridos'
			})
		}

		const clientExists = await clientServices.validateClientExists(clientId)

		if (!clientExists) {
			return res.status(404).json({
				message: 'Cliente no encontrado'
			})
		}

		const normalizedTitle = title.trim()

		if (!normalizedTitle) {
			return res.status(400).json({
				message: 'El title no puede estar vacío'
			})
		}

		const diet = new Diet({
			clientId,
			title: normalizedTitle,
			...(plan !== undefined ? { plan } : {})
		})

		await diet.save()

		res.status(201).json({
			message: 'Dieta creada exitosamente',
			diet
		})
	} catch (error) {
		console.error('Error en create:', error)
		res.status(500).json({
			message: 'Error al crear dieta',
			error: error.message
		})
	}
})

// GetAllByClient - Obtener todas las dietas de un cliente (vista ligera)
router.get('/:clientId/getAll', async (req, res) => {
	try {
		const { clientId } = req.params

		const clientExists = await clientServices.validateClientExists(clientId)

		if (!clientExists) {
			return res.status(404).json({
				message: 'Cliente no encontrado'
			})
		}

		const diets = await Diet.find({ clientId })
			.select('_id clientId title createdAt updatedAt')
			.sort({ createdAt: -1 })

		res.status(200).json({
			message: 'Dietas obtenidas exitosamente',
			clientId,
			count: diets.length,
			diets
		})
	} catch (error) {
		console.error('Error en getAll:', error)
		res.status(500).json({
			message: 'Error al obtener dietas',
			error: error.message
		})
	}
})

// GetById - Obtener una dieta específica de un cliente
router.get('/:clientId/getById/:id', async (req, res) => {
	try {
		const { clientId, id } = req.params

		const clientExists = await clientServices.validateClientExists(clientId)

		if (!clientExists) {
			return res.status(404).json({
				message: 'Cliente no encontrado'
			})
		}

		const diet = await Diet.findOne({ _id: id, clientId })

		if (!diet) {
			return res.status(404).json({
				message: 'Dieta no encontrada'
			})
		}

		res.status(200).json({
			message: 'Dieta obtenida exitosamente',
			diet
		})
	} catch (error) {
		console.error('Error en getById:', error)
		res.status(500).json({
			message: 'Error al obtener dieta',
			error: error.message
		})
	}
})

// Update - Actualizar una dieta de un cliente
router.put('/:clientId/update/:id', async (req, res) => {
	try {
		const { clientId, id } = req.params
		const { title, plan } = req.body

		const clientExists = await clientServices.validateClientExists(clientId)

		if (!clientExists) {
			return res.status(404).json({
				message: 'Cliente no encontrado'
			})
		}

		const diet = await Diet.findOne({ _id: id, clientId })

		if (!diet) {
			return res.status(404).json({
				message: 'Dieta no encontrada'
			})
		}

		if (title !== undefined) {
			const normalizedTitle = title.trim()

			if (!normalizedTitle) {
				return res.status(400).json({
					message: 'El title no puede estar vacío'
				})
			}

			diet.title = normalizedTitle
		}

		if (plan !== undefined) diet.plan = plan

		await diet.save()

		res.status(200).json({
			message: 'Dieta actualizada exitosamente',
			diet
		})
	} catch (error) {
		console.error('Error en update:', error)
		res.status(500).json({
			message: 'Error al actualizar dieta',
			error: error.message
		})
	}
})

// Delete - Hard delete de una dieta de un cliente
router.delete('/:clientId/delete/:id', async (req, res) => {
	try {
		const { clientId, id } = req.params

		const clientExists = await clientServices.validateClientExists(clientId)

		if (!clientExists) {
			return res.status(404).json({
				message: 'Cliente no encontrado'
			})
		}

		const diet = await Diet.findOneAndDelete({ _id: id, clientId })

		if (!diet) {
			return res.status(404).json({
				message: 'Dieta no encontrada'
			})
		}

		res.status(200).json({
			message: 'Dieta eliminada exitosamente',
			diet
		})
	} catch (error) {
		console.error('Error en delete:', error)
		res.status(500).json({
			message: 'Error al eliminar dieta',
			error: error.message
		})
	}
})

export const routeConfig = { path: "/v1/diets", router }