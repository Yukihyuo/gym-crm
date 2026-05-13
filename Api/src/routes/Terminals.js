import express from 'express';
import { randomUUID } from 'crypto';
import Terminal from '../models/Terminal.js';
import PendingData from '../models/PendingData.js';

async function generateUniqueCode() {
  let code;
  let exists = true;
  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    // Verificamos que el código no esté en uso actualmente en la colección de pendientes
    const duplicate = await PendingData.findOne({ value: code });
    if (!duplicate) exists = false;
  }
  return code;
}

const router = express.Router();

// Crear terminal
router.post('/create', async (req, res) => {
  try {
    const { name } = req.body;
    const storeId = req.headers['x-store-id'] || req.body.storeId;

    if (!name?.trim()) {
      return res.status(400).json({
        message: 'El nombre de la terminal es requerido'
      });
    }

    if (!storeId) {
      return res.status(400).json({
        message: 'No se encontró la tienda activa para crear la terminal'
      });
    }

    const uniqueCode = await generateUniqueCode();

    const terminal = await Terminal.create({
      uuid: `pending-${randomUUID()}`,
      storeId,
      name: name.trim(),
      isLinked: false
    });

    await PendingData.create({
      type: 'LinkTerminal',
      sourceId: terminal._id,
      value: uniqueCode
    });

    res.status(201).json({
      message: 'Terminal creada exitosamente',
      terminal,
      uniqueCode
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al crear terminal',
      error: error.message
    });
  }
});

// Obtener terminales
router.get('/getAll', async (req, res) => {
  try {
    const storeId = req.query.storeId || req.headers['x-store-id'];
    const query = storeId ? { storeId } : {};

    const terminals = await Terminal.find(query)
      .populate('deviceId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Terminales obtenidas exitosamente',
      count: terminals.length,
      terminals
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener terminales',
      error: error.message
    });
  }
});

// Eliminar terminal
router.delete('/delete/:id', async (req, res) => {
  try {
    const terminal = await Terminal.findByIdAndDelete(req.params.id);

    if (!terminal) {
      return res.status(404).json({ message: 'Terminal no encontrada' });
    }

    res.status(200).json({
      message: 'Terminal eliminada exitosamente',
      terminal
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al eliminar terminal',
      error: error.message
    });
  }
});

// 1. Python pide su configuración usando su UUID
router.get('/config/:uuid', async (req, res) => {
  try {
    const terminal = await Terminal.findOne({ uuid: req.params.uuid })
      .populate('deviceId');

    if (!terminal) return res.status(404).json({ status: 'UNLINKED' });

    res.json({
      status: 'LINKED',
      config: terminal.deviceId // Aquí van VID, PID, Driver...
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Vincular terminal con UUID (Desde la ventanita de Python)
router.post('/vincular', async (req, res) => {
  const { uuid, terminalId } = req.body;

  if (!uuid || !terminalId) {
    return res.status(400).json({ message: 'uuid y terminalId son requeridos' });
  }

  const terminal = await Terminal.findOne({ _id: terminalId });

  if (!terminal) {
    return res.status(404).json({ message: 'Terminal no encontrada' });
  }

  if (terminal.isLinked) {
    return res.status(400).json({ message: 'La terminal ya está vinculada' });
  }

  const existingUuid = await Terminal.findOne({ uuid });
  if (existingUuid && existingUuid._id !== terminalId) {
    return res.status(400).json({ message: 'El UUID ya está en uso por otra terminal' });
  }

  terminal.uuid = uuid;
  terminal.isLinked = true;
  await terminal.save();

  res.json({ message: "Vinculación exitosa" });
});


export const routeConfig = { path: "/v1/terminals", router }