import express from "express"
import dayjs from 'dayjs';

import SubscriptionAssignment from "../models/SubscriptionAssignment.js"
import Client from "../models/Client.js"
import Store from "../models/Store.js"
import Subscription from "../models/Subscription.js"
import { updateCashCutWithDocument } from "./CashCuts.js";
import {
  buildSubscriptionsError,
  createSubscriptionAssignment,
  findPopulatedAssignmentById,
  populateAssignmentQuery,
  validateAssignmentEditableRefs
} from "../utils/subscriptions.utils.js"

const router = express.Router()

// --- ENDPOINT: CREAR ASIGNACIÓN (CORREGIDO) ---
router.post('/create', async (req, res) => {
  try {
    const { clientId, storeId, planId, paymentMethod } = req.body;

    const { assignment, queued } = await createSubscriptionAssignment({
      clientId,
      storeId,
      planId,
      paymentMethod
    })

    const cashCutId = req.headers['x-cash-cut-id'];
    if (cashCutId) {
      await updateCashCutWithDocument(cashCutId, 'subscription', assignment._id.toString(), {
        paymentMethod: assignment.paymentMethod,
        pricePaid: assignment.pricePaid
      });
    }

    const populatedAssignment = await findPopulatedAssignmentById(assignment._id, true)

    res.status(201).json({
      message: queued
        ? 'Suscripción registrada exitosamente. Se activará al día siguiente de la suscripción vigente.'
        : 'Suscripción asignada exitosamente',
      assignment: populatedAssignment,
      queued
    });
  } catch (error) {
    console.error('Error en create:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
        error: error.message
      })
    }

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

    const assignments = await populateAssignmentQuery(
      SubscriptionAssignment.find({ brandId }),
      false
    )
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

    const assignments = await populateAssignmentQuery(
      SubscriptionAssignment.find({ clientId }),
      false
    )
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

    const assignment = await findPopulatedAssignmentById(id, false)

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

    await validateAssignmentEditableRefs({
      storeId,
      planId,
      assignmentBrandId: assignment.brandId
    })

    if (storeId !== undefined) {
      assignment.storeId = storeId;
    }

    if (planId !== undefined) {
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

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
        error: error.message
      })
    }

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