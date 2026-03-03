import express from "express"

import Subscription from "../models/Subscription.js"
import Brand from "../models/Brand.js"

const router = express.Router()

// Create - Crear una nueva membresía ligada a una marca
router.post('/create', async (req, res) => {
	try {
		const {
			brandId,
			name,
			description,
			duration,
			price,
			benefits,
			status
		} = req.body;

		// Validar campos requeridos
		if (!brandId || !name || duration?.value === undefined || price?.amount === undefined) {
			return res.status(400).json({
				message: 'brandId, nombre, duración (value) y precio (amount) son requeridos'
			});
		}

		// Validar que la marca exista
		const brand = await Brand.findById(brandId);

		if (!brand) {
			return res.status(404).json({
				message: 'Marca no encontrada'
			});
		}

		// Validaciones de negocio
		if (duration.value <= 0) {
			return res.status(400).json({
				message: 'La duración debe ser mayor a 0'
			});
		}

		if (price.amount < 0) {
			return res.status(400).json({
				message: 'El precio no puede ser negativo'
			});
		}

		// Evitar duplicados por marca
		const existingSubscription = await Subscription.findOne({
			brandId,
			name: name.trim(),
			status: { $ne: 'archived' }
		});

		if (existingSubscription) {
			return res.status(400).json({
				message: 'Ya existe una membresía con ese nombre para esta marca'
			});
		}

		const newSubscription = new Subscription({
			brandId,
			name: name.trim(),
			description,
			duration: {
				value: duration.value,
				unit: duration.unit || 'months'
			},
			price: {
				amount: price.amount,
				currency: price.currency || 'MXN'
			},
			benefits: Array.isArray(benefits) ? benefits : [],
			status: status || 'active'
		});

		await newSubscription.save();

		res.status(201).json({
			message: 'Membresía creada exitosamente',
			subscription: newSubscription
		});

	} catch (error) {
		console.error('Error en create:', error);
		res.status(500).json({
			message: 'Error al crear membresía',
			error: error.message
		});
	}
});

// GetByBrand - Obtener membresías por marca
router.get('/brand/:brandId', async (req, res) => {
	try {
		const { brandId } = req.params;

		const brand = await Brand.findById(brandId);
		if (!brand) {
			return res.status(404).json({
				message: 'Marca no encontrada'
			});
		}

		const subscriptions = await Subscription.find({ brandId }).sort({ createdAt: -1 });

		res.status(200).json({
			message: 'Membresías obtenidas exitosamente',
			brandId,
			count: subscriptions.length,
			subscriptions
		});

	} catch (error) {
		console.error('Error en getByBrand:', error);
		res.status(500).json({
			message: 'Error al obtener membresías por marca',
			error: error.message
		});
	}
});

// GetById - Obtener membresía por ID
router.get('/getById/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const subscription = await Subscription.findById(id);

		if (!subscription) {
			return res.status(404).json({
				message: 'Membresía no encontrada'
			});
		}

		res.status(200).json({
			message: 'Membresía obtenida exitosamente',
			subscription
		});

	} catch (error) {
		console.error('Error en getById:', error);
		res.status(500).json({
			message: 'Error al obtener membresía',
			error: error.message
		});
	}
});

// Update - Actualizar una membresía
router.put('/update/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const {
			name,
			description,
			duration,
			price,
			benefits,
			status
		} = req.body;

		const subscription = await Subscription.findById(id);

		if (!subscription) {
			return res.status(404).json({
				message: 'Membresía no encontrada'
			});
		}

		if (name !== undefined) {
			const trimmedName = name.trim();

			if (!trimmedName) {
				return res.status(400).json({
					message: 'El nombre no puede estar vacío'
				});
			}

			const existingSubscription = await Subscription.findOne({
				_id: { $ne: id },
				brandId: subscription.brandId,
				name: trimmedName,
				status: { $ne: 'archived' }
			});

			if (existingSubscription) {
				return res.status(400).json({
					message: 'Ya existe una membresía con ese nombre para esta marca'
				});
			}

			subscription.name = trimmedName;
		}

		if (description !== undefined) subscription.description = description;

		if (duration !== undefined) {
			if (duration.value !== undefined) {
				if (duration.value <= 0) {
					return res.status(400).json({
						message: 'La duración debe ser mayor a 0'
					});
				}
				subscription.duration.value = duration.value;
			}

			if (duration.unit !== undefined) subscription.duration.unit = duration.unit;
		}

		if (price !== undefined) {
			if (price.amount !== undefined) {
				if (price.amount < 0) {
					return res.status(400).json({
						message: 'El precio no puede ser negativo'
					});
				}
				subscription.price.amount = price.amount;
			}

			if (price.currency !== undefined) subscription.price.currency = price.currency;
		}

		if (benefits !== undefined) {
			if (!Array.isArray(benefits)) {
				return res.status(400).json({
					message: 'benefits debe ser un arreglo'
				});
			}

			subscription.benefits = benefits;
		}

		if (status !== undefined) subscription.status = status;

		await subscription.save();

		res.status(200).json({
			message: 'Membresía actualizada exitosamente',
			subscription
		});

	} catch (error) {
		console.error('Error en update:', error);
		res.status(500).json({
			message: 'Error al actualizar membresía',
			error: error.message
		});
	}
});

// Delete (lógico) - Marcar membresía como inactiva sin eliminar documento
router.delete('/delete/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const subscription = await Subscription.findById(id);

		if (!subscription) {
			return res.status(404).json({
				message: 'Membresía no encontrada'
			});
		}

		subscription.status = 'inactive';
		await subscription.save();

		res.status(200).json({
			message: 'Membresía dada de baja exitosamente',
			subscription
		});

	} catch (error) {
		console.error('Error en delete:', error);
		res.status(500).json({
			message: 'Error al dar de baja membresía',
			error: error.message
		});
	}
});


export const routeConfig = { path: "/v1/subscriptions", router }