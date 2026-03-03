import express from "express"

import SubscriptionAssignment from "../models/SubscriptionAssignment.js"
import Client from "../models/Client.js"
import Visit from "../models/Visit.js"
import Store from "../models/Store.js"
import Subscription from "../models/Subscription.js"

const router = express.Router()

const calculateEndDate = (startDate, duration) => {
  const endDate = new Date(startDate);
  const value = Number(duration?.value || 0);
  const unit = duration?.unit || 'months';

  if (value <= 0) return null;

  switch (unit) {
    case 'days':
      endDate.setDate(endDate.getDate() + value);
      break;
    case 'weeks':
      endDate.setDate(endDate.getDate() + (value * 7));
      break;
    case 'years':
      endDate.setFullYear(endDate.getFullYear() + value);
      break;
    case 'months':
    default:
      endDate.setMonth(endDate.getMonth() + value);
      break;
  }

  return endDate;
};

// Create - Asignar una membresía a un cliente
router.post('/create', async (req, res) => {
  try {
    const { clientId, storeId, planId } = req.body;

    if (!clientId || !storeId || !planId) {
      return res.status(400).json({
        message: 'clientId, storeId y planId son requeridos'
      });
    }

    const [client, store, subscription] = await Promise.all([
      Client.findById(clientId),
      Store.findById(storeId),
      Subscription.findById(planId)
    ]);

    if (!client) {
      return res.status(404).json({
        message: 'Cliente no encontrado'
      });
    }

    if (!store) {
      return res.status(404).json({
        message: 'Tienda no encontrada'
      });
    }

    if (!subscription) {
      return res.status(404).json({
        message: 'Membresía no encontrada'
      });
    }

    if (subscription.status !== 'active') {
      return res.status(400).json({
        message: 'Solo se pueden asignar membresías activas'
      });
    }

    if (client.brandId !== store.brandId || subscription.brandId !== store.brandId) {
      return res.status(400).json({
        message: 'Cliente, tienda y membresía deben pertenecer a la misma marca'
      });
    }

    const existingActiveAssignment = await SubscriptionAssignment.findOne({
      clientId,
      planId,
      status: 'active'
    });

    if (existingActiveAssignment) {
      return res.status(400).json({
        message: 'El cliente ya tiene esta membresía activa'
      });
    }

    const assignmentStartDate = new Date();
    const assignmentEndDate = calculateEndDate(assignmentStartDate, subscription.duration);

    const newAssignment = new SubscriptionAssignment({
      brandId: store.brandId,
      storeId,
      clientId,
      planId,
      startDate: assignmentStartDate,
      endDate: assignmentEndDate,
      pricePaid: Number(subscription.price?.amount || 0),
    });

    await newAssignment.save();

    res.status(201).json({
      message: 'Membresía asignada exitosamente',
      assignment: newAssignment,
    });

  } catch (error) {
    console.error('Error en create:', error);
    res.status(500).json({
      message: 'Error al asignar membresía',
      error: error.message
    });
  }
});

// GetByBrand - Obtener asignaciones por marca
router.get('/brand/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;

    const assignments = await SubscriptionAssignment.find({ brandId })
      .populate({ path: 'clientId', select: 'profile.names profile.lastNames email' })
      .populate({ path: 'storeId', select: 'name' })
      .populate({ path: 'planId', select: 'name status' })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Asignaciones obtenidas exitosamente',
      brandId,
      count: assignments.length,
      assignments
    });

  } catch (error) {
    console.error('Error en getByBrand:', error);
    res.status(500).json({
      message: 'Error al obtener asignaciones por marca',
      error: error.message
    });
  }
});

// GetByClient - Obtener asignaciones por cliente
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        message: 'Cliente no encontrado'
      });
    }

    const assignments = await SubscriptionAssignment.find({ clientId })
      .populate({ path: 'clientId', select: 'profile.names profile.lastNames email' })
      .populate({ path: 'storeId', select: 'name' })
      .populate({ path: 'planId', select: 'name status' })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Asignaciones del cliente obtenidas exitosamente',
      clientId,
      count: assignments.length,
      assignments
    });

  } catch (error) {
    console.error('Error en getByClient:', error);
    res.status(500).json({
      message: 'Error al obtener asignaciones del cliente',
      error: error.message
    });
  }
});

// GetById - Obtener asignación por ID
router.get('/getById/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await SubscriptionAssignment.findById(id)
      .populate({ path: 'clientId', select: 'profile.names profile.lastNames email' })
      .populate({ path: 'storeId', select: 'name' })
      .populate({ path: 'planId', select: 'name status' });

    if (!assignment) {
      return res.status(404).json({
        message: 'Asignación no encontrada'
      });
    }

    res.status(200).json({
      message: 'Asignación obtenida exitosamente',
      assignment
    });

  } catch (error) {
    console.error('Error en getById:', error);
    res.status(500).json({
      message: 'Error al obtener asignación',
      error: error.message
    });
  }
});

// Update - Actualizar asignación
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId, userId, planId, startDate, endDate, pricePaid, status } = req.body;

    const assignment = await SubscriptionAssignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        message: 'Asignación no encontrada'
      });
    }

    if (pricePaid !== undefined && pricePaid < 0) {
      return res.status(400).json({
        message: 'pricePaid no puede ser negativo'
      });
    }

    if (storeId !== undefined) {
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({
          message: 'Tienda no encontrada'
        });
      }

      if (store.brandId !== assignment.brandId) {
        return res.status(400).json({
          message: 'La tienda debe pertenecer a la misma marca de la asignación'
        });
      }

      assignment.storeId = storeId;
    }

    if (planId !== undefined) {
      const plan = await Subscription.findById(planId);
      if (!plan) {
        return res.status(404).json({
          message: 'Membresía no encontrada'
        });
      }

      if (plan.brandId !== assignment.brandId) {
        return res.status(400).json({
          message: 'La membresía debe pertenecer a la misma marca de la asignación'
        });
      }

      assignment.planId = planId;
    }

    if (userId !== undefined) assignment.userId = userId;
    if (startDate !== undefined) assignment.startDate = new Date(startDate);
    if (endDate !== undefined) assignment.endDate = new Date(endDate);
    if (pricePaid !== undefined) assignment.pricePaid = pricePaid;
    if (status !== undefined) assignment.status = status;

    await assignment.save();

    res.status(200).json({
      message: 'Asignación actualizada exitosamente',
      assignment
    });

  } catch (error) {
    console.error('Error en update:', error);
    res.status(500).json({
      message: 'Error al actualizar asignación',
      error: error.message
    });
  }
});

// Delete (lógico) - Cancelar asignación sin eliminar documento
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await SubscriptionAssignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        message: 'Asignación no encontrada'
      });
    }

    assignment.status = 'cancelled';
    await assignment.save();

    res.status(200).json({
      message: 'Asignación cancelada exitosamente',
      assignment
    });

  } catch (error) {
    console.error('Error en delete:', error);
    res.status(500).json({
      message: 'Error al cancelar asignación',
      error: error.message
    });
  }
});


export const routeConfig = { path: "/v1/subscriptions-assignments", router }