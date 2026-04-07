import express from "express"
import dayjs from 'dayjs';

import SubscriptionAssignment from "../models/SubscriptionAssignment.js"
import Client from "../models/Client.js"
import Store from "../models/Store.js"
import Subscription from "../models/Subscription.js"
import { updateCashCutWithDocument } from "./CashCuts.js";

const router = express.Router()

const calculateEndDate = (startDate, duration) => {
  const value = Number(duration?.value || 0);
  const unit = duration?.unit || 'months'; // Day.js acepta 'days', 'weeks', 'months', 'years'

  if (value <= 0) return null;

  // Regla de negocio: duración de 1 día termina el mismo día de inicio.
  if (unit === 'days' && value === 1) {
    return dayjs(startDate).endOf('day').toDate();
  }

  return dayjs(startDate)
    .add(value, unit)
    .endOf('day')
    .toDate();
};

// --- ENDPOINT: CREAR ASIGNACIÓN (CORREGIDO) ---
router.post('/create', async (req, res) => {
  try {
    const { clientId, storeId, planId, paymentMethod } = req.body;

    if (!clientId || !storeId || !planId || !paymentMethod) {
      return res.status(400).json({
        message: 'Faltan datos requeridos: clientId, storeId, planId, paymentMethod'
      });
    }

    const [client, store, plan] = await Promise.all([
      Client.findById(clientId),
      Store.findById(storeId),
      Subscription.findById(planId)
    ]);

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    if (!store) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }

    if (!plan) {
      return res.status(404).json({ message: 'Membresía no encontrada' });
    }

    if (client.brandId !== store.brandId || plan.brandId !== store.brandId) {
      return res.status(400).json({
        message: 'Cliente, tienda y membresía deben pertenecer a la misma marca'
      });
    }

    const todayStart = dayjs().startOf('day').toDate();

    // Si ya existe una suscripción activa para hoy o más adelante, encadenamos la nueva.
    const latestActiveAssignment = await SubscriptionAssignment.findOne({
      clientId,
      status: 'active',
      endDate: { $gte: todayStart }
    }).sort({ endDate: -1, createdAt: -1 });

    const startDate = latestActiveAssignment?.endDate
      ? dayjs(latestActiveAssignment.endDate).add(1, 'day').startOf('day').toDate()
      : todayStart;

    const endDate = calculateEndDate(startDate, plan.duration);

    if (!endDate) {
      return res.status(400).json({
        message: 'La duración de la membresía es inválida'
      });
    }

    const assignment = await SubscriptionAssignment.create({
      brandId: store.brandId,
      storeId,
      clientId,
      planId,
      startDate,
      endDate,
      pricePaid: Number(plan.price?.amount || 0),
      paymentMethod,
      status: 'active'
    });

    const cashCutId = req.headers['x-cash-cut-id'];
    if (cashCutId) {
      await updateCashCutWithDocument(cashCutId, 'subscription', assignment._id.toString(), {
        paymentMethod: assignment.paymentMethod,
        pricePaid: assignment.pricePaid
      });
    }

    const populatedAssignment = await SubscriptionAssignment.findById(assignment._id)
      .populate({ path: 'clientId', select: 'profile.names profile.lastNames email' })
      .populate({ path: 'storeId', select: 'name' })
      .populate({ path: 'planId', select: 'name status duration price' });

    const isQueued = Boolean(latestActiveAssignment?.endDate);

    res.status(201).json({
      message: isQueued
        ? 'Suscripción registrada exitosamente. Se activará al día siguiente de la suscripción vigente.'
        : 'Suscripción asignada exitosamente',
      assignment: populatedAssignment,
      queued: isQueued
    });
  } catch (error) {
    console.error('Error en create:', error);
    res.status(500).json({
      message: 'Error al crear asignación de suscripción',
      error: error.message
    });
  }
});

// --- ENDPOINT: MANTENIMIENTO (MIGRACIÓN DE 5K REGISTROS) ---
// Este endpoint normaliza los endDate existentes al final de su respectivo día
router.patch('/maintenance/normalize-dates', async (req, res) => {
  try {
    // 1. Buscamos todas las asignaciones que tengan un endDate
    const assignments = await SubscriptionAssignment.find({ endDate: { $exists: true } });
    
    let updatedCount = 0;

    // 2. Usamos un BulkWrite para mayor eficiencia con 5k+ registros
    const bulkOps = assignments.map(doc => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { 
          $set: { 
            endDate: dayjs(doc.endDate).endOf('day').toDate() 
          } 
        }
      }
    }));

    if (bulkOps.length > 0) {
      const result = await SubscriptionAssignment.bulkWrite(bulkOps);
      updatedCount = result.modifiedCount;
    }

    res.json({
      message: 'Normalización completada con éxito',
      registrosProcesados: assignments.length,
      registrosModificados: updatedCount
    });

  } catch (error) {
    console.error('Error en mantenimiento:', error);
    res.status(500).json({ message: 'Error en la migración', error: error.message });
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